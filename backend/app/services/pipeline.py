"""Ingestion pipeline: Document AI -> structured extraction -> deterministic validation -> DB -> Qdrant."""
from __future__ import annotations

import logging
from contextlib import contextmanager
from pathlib import Path
from time import perf_counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import AuditLog, ClinicalRecord, Document, Patient
from ..validation import validate_item
from .extraction import EXTRACTION_SCHEMA, EXTRACTION_SYSTEM, apply_report_date, build_extraction_prompt
from .http import ExternalServiceError
from .vector_store import record_to_text

log = logging.getLogger("medchronicle.pipeline")
MAX_ITEMS_PER_DOCUMENT = 500


@contextmanager
def _timed(timings: dict, stage: str):
    started = perf_counter()
    try:
        yield
    finally:
        timings[stage] = round(perf_counter() - started, 6)


def _dedup_key(f: dict) -> tuple:
    return (f["kind"], (f["name"] or "").lower(), f["effective_date"], f["value_num"], f["value_text"], f["dose"])


def index_records(db: Session, services, recs: list[ClinicalRecord], *, timings: dict | None = None) -> int:
    """Embed and upsert verified records. Returns number indexed. Safe to call repeatedly."""
    recs = [r for r in recs if r.status == "verified"]
    if not recs:
        return 0
    doc_names = {d.id: d.filename for d in db.scalars(select(Document).where(Document.id.in_({r.document_id for r in recs if r.document_id})))}
    texts = [record_to_text(r, doc_names.get(r.document_id)) for r in recs]
    timings = timings if timings is not None else {}
    with _timed(timings, "embedding_seconds"):
        vectors = services.gemini.embed(texts, task_type="RETRIEVAL_DOCUMENT")
    with _timed(timings, "vector_upsert_seconds"):
        services.vectors.upsert(recs, texts, vectors)
    for r in recs:
        r.indexed = True
    db.commit()
    return len(recs)


def unindex_records(db: Session, services, recs: list[ClinicalRecord]) -> None:
    ids = [r.id for r in recs if r.indexed]
    if ids:
        services.vectors.delete(ids)
    for r in recs:
        r.indexed = False
    db.commit()


def process_document(db: Session, services, document_id: str) -> Document:
    started = perf_counter()
    timings: dict[str, float] = {}
    doc = db.get(Document, document_id)
    if doc is None:
        raise LookupError(document_id)
    patient = db.get(Patient, doc.patient_id)
    try:
        doc.status = "digitising"
        db.commit()
        with _timed(timings, "file_read_seconds"):
            content = Path(doc.storage_path).read_bytes()
        with _timed(timings, "ocr_seconds"):
            job_id, text = services.sarvam.digitise(content, doc.filename, doc.mime_type)
        doc.docai_job_id, doc.text = job_id, text

        doc.status = "extracting"
        db.commit()
        with _timed(timings, "extraction_seconds"):
            raw = services.gemini.generate_json(EXTRACTION_SYSTEM, build_extraction_prompt(text), EXTRACTION_SCHEMA)
        validation_started = perf_counter()
        items = apply_report_date(raw)[:MAX_ITEMS_PER_DOCUMENT]

        existing = {(r.kind, r.name.lower(), r.effective_date, r.value_num, r.value_text, r.dose)
                    for r in db.scalars(select(ClinicalRecord).where(ClinicalRecord.patient_id == doc.patient_id,
                                                                     ClinicalRecord.status != "rejected"))}
        created: list[ClinicalRecord] = []
        counts = {"verified": 0, "needs_review": 0, "rejected": 0, "duplicate": 0}
        for item in items:
            res = validate_item(item, document_text=text, birth_date=patient.birth_date,
                                min_confidence=services.settings.min_extraction_confidence)
            key = _dedup_key(res.fields)
            if res.status != "rejected" and key in existing:
                counts["duplicate"] += 1
                continue
            existing.add(key)
            rec = ClinicalRecord(patient_id=doc.patient_id, document_id=doc.id, status=res.status,
                                 issues=[i.as_dict() for i in res.issues], **res.fields)
            db.add(rec)
            created.append(rec)
            counts[res.status] += 1
        doc.status = "validated"
        db.add(AuditLog(user_id=doc.uploaded_by, action="document.processed", patient_id=doc.patient_id,
                        detail={"document_id": doc.id, **counts}))
        db.commit()
        timings["validation_and_persistence_seconds"] = round(perf_counter() - validation_started, 6)
    except ExternalServiceError as e:
        db.rollback()
        doc = db.get(Document, document_id)
        doc.status, doc.error = "failed", e.safe_message
        db.commit()
        log.warning("document %s failed: %s", document_id, e.service)
        return doc
    except Exception as e:
        db.rollback()
        doc = db.get(Document, document_id)
        doc.status, doc.error = "failed", "Internal processing error."
        db.commit()
        log.exception("document %s failed (%s)", document_id, type(e).__name__)
        return doc

    indexed = 0
    indexing_status = "completed"
    try:
        indexed = index_records(db, services, created, timings=timings)
    except Exception as e:  # records stay verified; /admin/reindex can retry
        db.rollback()
        indexing_status = "failed"
        log.warning("indexing failed for document %s: %s", document_id, type(e).__name__)
    timings["total_seconds"] = round(perf_counter() - started, 6)
    db.add(AuditLog(user_id=doc.uploaded_by, action="document.processing_completed", patient_id=doc.patient_id,
                    detail={"document_id": doc.id, "timings": timings, "indexed": indexed,
                            "indexing_status": indexing_status}))
    db.commit()
    return doc

"""Qdrant vector store for verified clinical records.

Isolation guarantee: every search carries a mandatory `patient_id` filter built here, never by
callers, so one patient's records can never be retrieved for another patient.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from qdrant_client import QdrantClient, models as qm

from ..models import ClinicalRecord


def record_to_text(rec: ClinicalRecord, document_name: str | None = None) -> str:
    """Natural-language rendering of a verified record; this is what gets embedded and cited."""
    d = rec.effective_date.isoformat() if rec.effective_date else "date unknown"
    label = {"lab_result": "Lab result", "vital": "Vital sign", "medication": "Medication", "condition": "Condition",
             "allergy": "Allergy", "procedure": "Procedure"}.get(rec.kind, rec.kind)
    if rec.kind in ("lab_result", "vital"):
        val = rec.value_text or (f"{rec.value_num:g}" if rec.value_num is not None else "")
        s = f"{label}: {rec.name} {val} {rec.unit or ''}".rstrip()
        rng = None
        if rec.ref_low is not None and rec.ref_high is not None:
            rng = f"reference {rec.ref_low:g}-{rec.ref_high:g}"
        elif rec.ref_high is not None:
            rng = f"reference below {rec.ref_high:g}"
        elif rec.ref_low is not None:
            rng = f"reference above {rec.ref_low:g}"
        extra = ", ".join(x for x in (rec.flag, rng) if x)
        if extra:
            s += f" ({extra})"
        s += f" on {d}."
    elif rec.kind == "medication":
        s = f"{label}: {rec.name} {' '.join(x for x in (rec.dose, rec.frequency) if x)}".rstrip() + f", recorded {d}."
    else:
        s = f"{label}: {rec.name}" + (f" — {rec.value_text}" if rec.value_text else "") + f", recorded {d}."
    if document_name:
        s += f" Source: {document_name}."
    return s


@dataclass
class Hit:
    record_id: str
    score: float
    text: str
    payload: dict


class VectorStore:
    def __init__(self, url: str, api_key: str | None, collection: str, dim: int, *, local_path: str | None = None):
        if local_path:
            self.client = QdrantClient(path=local_path)
        elif url in (":memory:", "", None) or (url.startswith("http") and not api_key):
            self.client = QdrantClient(location=":memory:")
        else:
            self.client = QdrantClient(url=url, api_key=api_key or None, timeout=30)
        self.collection = collection
        self.dim = dim

    def ensure_collection(self) -> None:
        if not self.client.collection_exists(self.collection):
            self.client.create_collection(
                self.collection, vectors_config=qm.VectorParams(size=self.dim, distance=qm.Distance.COSINE))
            for field, schema in (("patient_id", qm.PayloadSchemaType.KEYWORD), ("kind", qm.PayloadSchemaType.KEYWORD),
                                  ("date", qm.PayloadSchemaType.DATETIME)):
                try:
                    self.client.create_payload_index(self.collection, field, field_schema=schema)
                except Exception:  # pragma: no cover - local mode doesn't support indexes
                    pass

    def upsert(self, recs: list[ClinicalRecord], texts: list[str], vectors: list[list[float]]) -> None:
        if not recs:
            return
        points = []
        for rec, text, vec in zip(recs, texts, vectors, strict=True):
            if rec.status != "verified":
                raise ValueError("refusing to index an unverified record")
            points.append(qm.PointStruct(id=rec.id, vector=vec, payload={
                "patient_id": rec.patient_id, "record_id": rec.id, "document_id": rec.document_id,
                "kind": rec.kind, "name": rec.name,
                "date": rec.effective_date.isoformat() if rec.effective_date else None,
                "text": text,
            }))
        self.client.upsert(self.collection, points=points, wait=True)

    def delete(self, record_ids: list[str]) -> None:
        if record_ids:
            self.client.delete(self.collection, points_selector=qm.PointIdsList(points=record_ids), wait=True)

    def delete_patient(self, patient_id: str) -> None:
        self.client.delete(self.collection, points_selector=qm.FilterSelector(filter=qm.Filter(must=[
            qm.FieldCondition(key="patient_id", match=qm.MatchValue(value=patient_id))])), wait=True)

    def search(self, patient_id: str, vector: list[float], *, limit: int = 8, score_threshold: float | None = None,
               kinds: list[str] | None = None, date_from: date | None = None, date_to: date | None = None) -> list[Hit]:
        if not patient_id:
            raise ValueError("patient_id is required for every vector search")
        must: list = [qm.FieldCondition(key="patient_id", match=qm.MatchValue(value=patient_id))]
        if kinds:
            must.append(qm.FieldCondition(key="kind", match=qm.MatchAny(any=kinds)))
        if date_from or date_to:
            must.append(qm.FieldCondition(key="date", range=qm.DatetimeRange(
                gte=date_from.isoformat() if date_from else None, lte=date_to.isoformat() if date_to else None)))
        res = self.client.query_points(self.collection, query=vector, query_filter=qm.Filter(must=must),
                                       limit=limit, score_threshold=score_threshold, with_payload=True)
        hits = []
        for p in res.points:
            if (p.payload or {}).get("patient_id") != patient_id:  # defence in depth
                continue
            hits.append(Hit(record_id=str(p.payload["record_id"]), score=float(p.score), text=p.payload.get("text", ""), payload=p.payload))
        return hits

    def count(self, patient_id: str | None = None) -> int:
        flt = None
        if patient_id:
            flt = qm.Filter(must=[qm.FieldCondition(key="patient_id", match=qm.MatchValue(value=patient_id))])
        return self.client.count(self.collection, count_filter=flt, exact=True).count

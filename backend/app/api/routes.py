from __future__ import annotations

import base64
import hashlib
from datetime import date
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..fhir import patient_bundle
from ..models import AuditLog, ClinicalRecord, Document, Patient, PatientAccess, User
from ..languages import LANGUAGE_NAMES
from ..services.document_summary import summarize_document
from ..security import hash_api_key, new_api_key, sanitize_filename, sniff_audio, sniff_document
from ..services.pipeline import index_records, process_document, unindex_records
from ..services.rag import DISCLAIMER, GroundedAnswer, strip_citations
from ..services.sarvam import TTS_LANGUAGES
from ..validation import KINDS, validate_item
from .deps import audit, can_access, current_user, get_db, get_patient, get_services, require_roles

router = APIRouter(prefix="/api")
Lang = Field(default="en-IN", pattern=r"^[a-z]{2,3}-IN$")


# ----------------------------------------------------------------- schemas
class UserIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    role: Literal["admin", "clinician", "patient"]
    patient_ids: list[str] = []


class PatientIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    birth_date: date | None = None
    sex: Literal["male", "female", "other", "unknown"] | None = None


class AccessIn(BaseModel):
    user_id: str


class ReviewIn(BaseModel):
    action: Literal["approve", "reject"]
    corrections: dict = {}
    note: str | None = Field(default=None, max_length=500)


class AskIn(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    language: str = Lang


class TtsIn(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    language: str = Lang


def patient_out(p: Patient) -> dict:
    return {"id": p.id, "name": p.name, "birth_date": p.birth_date, "sex": p.sex}


def doc_out(d: Document) -> dict:
    return {"id": d.id, "patient_id": d.patient_id, "filename": d.filename, "mime_type": d.mime_type, "size_bytes": d.size_bytes,
            "status": d.status, "error": d.error, "created_at": d.created_at}


def rec_out(r: ClinicalRecord) -> dict:
    return {k: getattr(r, k) for k in ("id", "patient_id", "document_id", "kind", "name", "code", "value_num", "value_text", "unit",
                                       "ref_low", "ref_high", "flag", "effective_date", "dose", "frequency", "confidence",
                                       "source_text", "status", "issues", "indexed")}


def answer_out(a: GroundedAnswer) -> dict:
    return {"answer": a.text, "grounded": a.grounded, "insufficient_evidence": a.insufficient_evidence, "language": a.language,
            "citations": [{"label": c.label, "record_id": c.record_id, "text": c.text, "score": c.score, "document_id": c.document_id}
                          for c in a.citations],
            "guard_notes": a.guard_notes, "disclaimer": DISCLAIMER}


# ----------------------------------------------------------------- users
@router.get("/me")
def me(user: User = Depends(current_user)):
    return {"id": user.id, "name": user.name, "role": user.role}


WORKSPACE_NAME = "My Records"


@router.get("/workspace")
def workspace(user: User = Depends(require_roles("admin", "clinician")), db: Session = Depends(get_db)):
    """Get-or-create the single default record so users can just upload documents without managing patients."""
    q = select(Patient).where(Patient.name == WORKSPACE_NAME).order_by(Patient.created_at)
    if user.role != "admin":
        q = q.join(PatientAccess, PatientAccess.patient_id == Patient.id).where(PatientAccess.user_id == user.id)
    p = db.scalars(q).first()
    if not p:
        p = Patient(name=WORKSPACE_NAME)
        db.add(p)
        db.flush()
        if user.role != "admin":
            db.add(PatientAccess(user_id=user.id, patient_id=p.id))
        db.commit()
    return patient_out(p)


@router.post("/users", status_code=201)
def create_user(body: UserIn, admin: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    key = new_api_key()
    u = User(name=body.name, role=body.role, api_key_hash=hash_api_key(key))
    db.add(u)
    db.flush()
    for pid in body.patient_ids:
        if not db.get(Patient, pid):
            raise HTTPException(404, "Patient not found")
        db.add(PatientAccess(user_id=u.id, patient_id=pid))
    db.commit()
    audit(db, admin, "user.created", None, user_id=u.id, role=u.role)
    return {"id": u.id, "name": u.name, "role": u.role, "api_key": key}  # key shown exactly once


# ----------------------------------------------------------------- patients
@router.post("/patients", status_code=201)
def create_patient(body: PatientIn, user: User = Depends(require_roles("admin", "clinician")), db: Session = Depends(get_db)):
    if body.birth_date and body.birth_date > date.today():
        raise HTTPException(422, "birth_date cannot be in the future")
    p = Patient(**body.model_dump())
    db.add(p)
    db.flush()
    if user.role != "admin":
        db.add(PatientAccess(user_id=user.id, patient_id=p.id))
    db.commit()
    audit(db, user, "patient.created", p.id)
    return patient_out(p)


@router.get("/patients")
def list_patients(user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = select(Patient).order_by(Patient.created_at.desc())
    if user.role != "admin":
        q = q.join(PatientAccess, PatientAccess.patient_id == Patient.id).where(PatientAccess.user_id == user.id)
    return [patient_out(p) for p in db.scalars(q)]


@router.get("/patients/{patient_id}")
def read_patient(p: Patient = Depends(get_patient)):
    return patient_out(p)


@router.delete("/patients/{patient_id}", status_code=204)
def delete_patient(patient_id: str, admin: User = Depends(require_roles("admin")), db: Session = Depends(get_db), services=Depends(get_services)):
    p = db.get(Patient, patient_id)
    if not p:
        raise HTTPException(404, "Patient not found")
    services.vectors.delete_patient(patient_id)
    paths = [d.storage_path for d in p.documents]
    db.delete(p)
    db.commit()
    for path in paths:
        Path(path).unlink(missing_ok=True)
    audit(db, admin, "patient.deleted", patient_id)
    return Response(status_code=204)


@router.post("/patients/{patient_id}/access", status_code=201)
def grant_access(body: AccessIn, p: Patient = Depends(get_patient), admin: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    if not db.get(User, body.user_id):
        raise HTTPException(404, "User not found")
    if not can_access(db, db.get(User, body.user_id), p.id):
        db.add(PatientAccess(user_id=body.user_id, patient_id=p.id))
        db.commit()
    audit(db, admin, "access.granted", p.id, user_id=body.user_id)
    return {"ok": True}


# ----------------------------------------------------------------- documents
def _run_pipeline(app_state, document_id: str) -> None:
    db = app_state.db.SessionLocal()
    try:
        process_document(db, app_state.services, document_id)
    finally:
        db.close()


@router.post("/patients/{patient_id}/documents", status_code=202)
async def upload_document(request: Request, background: BackgroundTasks, file: UploadFile = File(...),
                          p: Patient = Depends(get_patient), user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = request.app.state.services.settings
    content = await file.read(s.max_document_bytes + 1)
    if len(content) > s.max_document_bytes:
        raise HTTPException(413, f"Document exceeds {s.max_document_bytes // (1024 * 1024)} MB")
    if not content:
        raise HTTPException(422, "Empty file")
    mime = sniff_document(content[:16])
    if not mime:
        raise HTTPException(415, "Only PDF, PNG and JPEG documents are accepted")
    sha = hashlib.sha256(content).hexdigest()
    dup = db.scalar(select(Document).where(Document.patient_id == p.id, Document.sha256 == sha, Document.status != "failed"))
    if dup:
        return doc_out(dup)
    name = sanitize_filename(file.filename)
    doc = Document(patient_id=p.id, filename=name, mime_type=mime, sha256=sha, size_bytes=len(content), storage_path="", uploaded_by=user.id)
    db.add(doc)
    db.flush()
    folder = Path(s.upload_dir) / p.id
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{doc.id}{ {'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg'}[mime] }"
    path.write_bytes(content)
    doc.storage_path = str(path)
    db.commit()
    audit(db, user, "document.uploaded", p.id, document_id=doc.id)
    background.add_task(_run_pipeline, request.app.state, doc.id)
    return doc_out(doc)


@router.get("/patients/{patient_id}/documents")
def list_documents(p: Patient = Depends(get_patient), db: Session = Depends(get_db)):
    return [doc_out(d) for d in db.scalars(select(Document).where(Document.patient_id == p.id).order_by(Document.created_at.desc()))]


def _get_doc(db: Session, user: User, document_id: str) -> Document:
    d = db.get(Document, document_id)
    if not d or not can_access(db, user, d.patient_id):
        raise HTTPException(404, "Document not found")
    return d


@router.get("/documents/{document_id}")
def read_document(document_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    d = _get_doc(db, user, document_id)
    return {**doc_out(d), "text": d.text}  # extracted text powers the "Original Text" view


@router.get("/documents/{document_id}/summary")
def document_summary(document_id: str, language: str = Query(...), user: User = Depends(current_user),
                     db: Session = Depends(get_db), services=Depends(get_services)):
    doc = _get_doc(db, user, document_id)
    if language not in LANGUAGE_NAMES:
        raise HTTPException(422, "Choose a supported summary language")
    if doc.status != "validated":
        raise HTTPException(409, "Wait for this document to finish processing")
    if not (doc.text or "").strip():
        raise HTTPException(422, "This document has no readable text to summarize")
    result = summarize_document(db, services.gemini, doc, language)
    return {"document_id": doc.id, "filename": doc.filename, "language": language, "summary": result.text,
            "audio_supported": language in TTS_LANGUAGES,
            "notice": "AI-generated document overview. This is not a verified medical record."}


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(document_id: str, user: User = Depends(require_roles("admin", "clinician")), db: Session = Depends(get_db), services=Depends(get_services)):
    d = _get_doc(db, user, document_id)
    recs = list(db.scalars(select(ClinicalRecord).where(ClinicalRecord.document_id == d.id)))
    unindex_records(db, services, recs)
    for r in recs:
        db.delete(r)
    pid, path = d.patient_id, d.storage_path
    db.delete(d)
    db.commit()
    Path(path).unlink(missing_ok=True)
    audit(db, user, "document.deleted", pid, document_id=document_id)
    return Response(status_code=204)


# ----------------------------------------------------------------- records
@router.get("/patients/{patient_id}/records")
def list_records(p: Patient = Depends(get_patient), db: Session = Depends(get_db),
                 status_: Literal["verified", "needs_review", "rejected"] | None = Query(None, alias="status"),
                 kind: str | None = None):
    q = select(ClinicalRecord).where(ClinicalRecord.patient_id == p.id)
    if status_:
        q = q.where(ClinicalRecord.status == status_)
    if kind:
        if kind not in KINDS:
            raise HTTPException(422, "Unknown kind")
        q = q.where(ClinicalRecord.kind == kind)
    q = q.order_by(ClinicalRecord.effective_date.desc().nulls_last(), ClinicalRecord.name)
    return [rec_out(r) for r in db.scalars(q)]


@router.get("/patients/{patient_id}/timeline")
def timeline(p: Patient = Depends(get_patient), db: Session = Depends(get_db)):
    recs = db.scalars(select(ClinicalRecord).where(ClinicalRecord.patient_id == p.id, ClinicalRecord.status == "verified")
                      .order_by(ClinicalRecord.effective_date.desc().nulls_last()))
    out: dict[str, list] = {}
    for r in recs:
        out.setdefault(r.effective_date.isoformat() if r.effective_date else "undated", []).append(rec_out(r))
    return [{"date": k, "records": v} for k, v in out.items()]


@router.post("/records/{record_id}/review")
def review_record(record_id: str, body: ReviewIn, user: User = Depends(require_roles("admin", "clinician")),
                  db: Session = Depends(get_db), services=Depends(get_services)):
    r = db.get(ClinicalRecord, record_id)
    if not r or not can_access(db, user, r.patient_id):
        raise HTTPException(404, "Record not found")
    if body.action == "reject":
        unindex_records(db, services, [r])
        r.status, r.reviewed_by = "rejected", user.id
        db.commit()
        audit(db, user, "record.rejected", r.patient_id, record_id=r.id)
        return rec_out(r)

    allowed = {"name", "value", "unit", "ref_range", "date", "dose", "frequency", "kind"}
    bad = set(body.corrections) - allowed
    if bad:
        raise HTTPException(422, f"Unsupported correction fields: {sorted(bad)}")
    item = {"kind": r.kind, "name": r.name,
            "value": r.value_text if r.value_text else r.value_num,
            "unit": r.unit, "ref_low": r.ref_low, "ref_high": r.ref_high, "date": r.effective_date,
            "dose": r.dose, "frequency": r.frequency, "confidence": r.confidence, "source_text": r.source_text}
    if "ref_range" in body.corrections:
        item.pop("ref_low"), item.pop("ref_high")
    item.update(body.corrections)
    patient = db.get(Patient, r.patient_id)
    res = validate_item(item, birth_date=patient.birth_date, human_verified=True,
                        min_confidence=services.settings.min_extraction_confidence)
    if res.status != "verified":
        raise HTTPException(422, {"message": "Record still fails validation", "issues": [i.as_dict() for i in res.issues]})
    for k, v in res.fields.items():
        if k not in ("confidence", "source_text"):
            setattr(r, k, v)
    r.status, r.reviewed_by = "verified", user.id
    r.issues = [{"level": "info", "code": "clinician_verified", "message": body.note or "Approved by clinician."}]
    db.commit()
    index_records(db, services, [r])
    audit(db, user, "record.approved", r.patient_id, record_id=r.id, corrected=sorted(body.corrections))
    return rec_out(r)


# ----------------------------------------------------------------- FHIR
@router.get("/patients/{patient_id}/fhir")
def fhir_bundle(p: Patient = Depends(get_patient), db: Session = Depends(get_db)):
    recs = list(db.scalars(select(ClinicalRecord).where(ClinicalRecord.patient_id == p.id, ClinicalRecord.status == "verified")))
    docs = list(db.scalars(select(Document).where(Document.patient_id == p.id)))
    import json

    return Response(json.dumps(patient_bundle(p, recs, docs), default=str), media_type="application/fhir+json")


# ----------------------------------------------------------------- semantic search & RAG
@router.get("/patients/{patient_id}/search")
def semantic_search(q: str = Query(min_length=1, max_length=500), kind: list[str] = Query(default=[]),
                    date_from: date | None = None, date_to: date | None = None, limit: int = Query(10, ge=1, le=50),
                    p: Patient = Depends(get_patient), db: Session = Depends(get_db), services=Depends(get_services),
                    user: User = Depends(current_user)):
    if any(k not in KINDS for k in kind):
        raise HTTPException(422, "Unknown kind")
    hits = services.rag.retrieve(p.id, q, kinds=kind or None, date_from=date_from, date_to=date_to, limit=limit)
    recs = {r.id: r for r in db.scalars(select(ClinicalRecord).where(
        ClinicalRecord.id.in_([h.record_id for h in hits]), ClinicalRecord.status == "verified"))} if hits else {}
    audit(db, user, "search", p.id, results=len(hits))
    return [{"score": h.score, "text": h.text, "record": rec_out(recs[h.record_id])} for h in hits if h.record_id in recs]


@router.post("/patients/{patient_id}/ask")
def ask(body: AskIn, p: Patient = Depends(get_patient), db: Session = Depends(get_db), services=Depends(get_services),
        user: User = Depends(current_user)):
    a = services.rag.answer(db, p.id, body.question, body.language)
    audit(db, user, "ask", p.id, citations=len(a.citations), grounded=a.grounded, insufficient=a.insufficient_evidence)
    return answer_out(a)


@router.get("/patients/{patient_id}/summary")
def summary(language: str = Query("en-IN", pattern=r"^[a-z]{2,3}-IN$"), p: Patient = Depends(get_patient),
            db: Session = Depends(get_db), services=Depends(get_services)):
    if language not in LANGUAGE_NAMES:
        raise HTTPException(422, "Choose a supported summary language")
    return answer_out(services.rag.summary(db, p.id, language))


@router.get("/patients/{patient_id}/summary/audio")
def summary_audio(language: str = Query("en-IN", pattern=r"^[a-z]{2,3}-IN$"), p: Patient = Depends(get_patient),
                  db: Session = Depends(get_db), services=Depends(get_services), user: User = Depends(current_user)):
    if language not in TTS_LANGUAGES:
        raise HTTPException(422, "Sarvam audio is not available for this language. You can download the text summary.")
    a = services.rag.summary(db, p.id, language)
    speech = f"{strip_citations(a.text)} {DISCLAIMER if language == 'en-IN' else ''}".strip()
    wav = services.sarvam.synthesize(speech, language if language in TTS_LANGUAGES else "en-IN")
    audit(db, user, "summary.audio", p.id, language=language)
    return Response(wav, media_type="audio/wav", headers={"Cache-Control": "no-store"})


# ----------------------------------------------------------------- voice
@router.post("/patients/{patient_id}/voice/query")
async def voice_query(request: Request, audio: UploadFile = File(...), language: str = Form("unknown"),
                      speak: bool = Form(True), p: Patient = Depends(get_patient), db: Session = Depends(get_db),
                      user: User = Depends(current_user)):
    services = request.app.state.services
    if language != "unknown" and language not in TTS_LANGUAGES and not language.endswith("-IN"):
        raise HTTPException(422, "Unsupported language code")
    blob = await audio.read(services.settings.max_audio_bytes + 1)
    if len(blob) > services.settings.max_audio_bytes:
        raise HTTPException(413, "Audio clip is too large")
    mime = sniff_audio(blob[:16])
    if not mime:
        raise HTTPException(415, "Unsupported audio format")
    t = services.sarvam.transcribe(blob, sanitize_filename(audio.filename, "query"), mime, language)
    if not t.text:
        raise HTTPException(422, "No speech detected in the audio")
    lang = t.language_code if t.language_code in TTS_LANGUAGES else "en-IN"
    a = services.rag.answer(db, p.id, t.text, lang)
    out = {"transcript": t.text, "detected_language": t.language_code, **answer_out(a), "audio_base64": None}
    if speak:
        out["audio_base64"] = base64.b64encode(services.sarvam.synthesize(strip_citations(a.text), lang)).decode()
    audit(db, user, "voice.query", p.id, language=lang, citations=len(a.citations))
    return out


@router.post("/voice/transcribe")
async def transcribe(request: Request, audio: UploadFile = File(...), language: str = Form("unknown"), user: User = Depends(current_user)):
    services = request.app.state.services
    blob = await audio.read(services.settings.max_audio_bytes + 1)
    if len(blob) > services.settings.max_audio_bytes:
        raise HTTPException(413, "Audio clip is too large")
    mime = sniff_audio(blob[:16])
    if not mime:
        raise HTTPException(415, "Unsupported audio format")
    t = services.sarvam.transcribe(blob, sanitize_filename(audio.filename, "query"), mime, language)
    return {"transcript": t.text, "language_code": t.language_code}


@router.post("/voice/tts")
def tts(body: TtsIn, user: User = Depends(current_user), services=Depends(get_services)):
    if body.language not in TTS_LANGUAGES:
        raise HTTPException(422, "Sarvam audio is not available for this language. You can download the text summary.")
    wav = services.sarvam.synthesize(body.text, body.language)
    return Response(wav, media_type="audio/wav", headers={"Cache-Control": "no-store"})


# ----------------------------------------------------------------- admin
@router.post("/admin/reindex")
def reindex(force: bool = False, admin: User = Depends(require_roles("admin")), db: Session = Depends(get_db), services=Depends(get_services)):
    query = select(ClinicalRecord).where(ClinicalRecord.status == "verified")
    if not force:
        query = query.where(ClinicalRecord.indexed.is_(False))
    recs = list(db.scalars(query))
    n = index_records(db, services, recs)
    audit(db, admin, "admin.reindex", None, indexed=n)
    return {"indexed": n}


@router.get("/patients/{patient_id}/audit")
def audit_log(p: Patient = Depends(get_patient), user: User = Depends(require_roles("admin", "clinician")), db: Session = Depends(get_db)):
    rows = db.scalars(select(AuditLog).where(AuditLog.patient_id == p.id).order_by(AuditLog.id.desc()).limit(200))
    return [{"id": a.id, "user_id": a.user_id, "action": a.action, "detail": a.detail, "created_at": a.created_at} for a in rows]

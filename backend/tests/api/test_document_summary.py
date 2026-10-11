from sqlalchemy import select

from app.languages import LANGUAGE_NAMES
from app.models import ClinicalRecord, Document, DocumentSummary


def test_nonmedical_document_summary_is_cached_and_not_a_clinical_record(client, admin, make_patient, upload, services, db):
    patient = make_patient()
    doc = upload(patient["id"], ["Video Search System", "React frontend", "FastAPI backend", "PostgreSQL storage"])
    path = f"/api/documents/{doc['id']}/summary"
    services.gemini.prompts.clear()
    first = client.get(path, params={"language": "hi-IN"}, headers=admin)
    assert first.status_code == 200
    assert "React" in first.json()["summary"]
    assert first.json()["audio_supported"] is True
    assert "not a verified medical record" in first.json()["notice"]
    assert "Hindi" in services.gemini.prompts[0][0]
    assert client.get(path, params={"language": "hi-IN"}, headers=admin).json() == first.json()
    assert len(services.gemini.prompts) == 1
    assert list(db.scalars(select(ClinicalRecord))) == []
    assert len(list(db.scalars(select(DocumentSummary)))) == 1
    source = db.get(Document, doc["id"])
    source.text += "\nRedis caching"
    db.commit()
    assert "Redis" in client.get(path, params={"language": "hi-IN"}, headers=admin).json()["summary"]
    assert len(services.gemini.prompts) == 2


def test_every_summary_language_reaches_model(client, admin, make_patient, upload, services):
    doc = upload(make_patient()["id"], ["React frontend for video search"])
    assert len(LANGUAGE_NAMES) == 23
    for code, name in LANGUAGE_NAMES.items():
        response = client.get(f"/api/documents/{doc['id']}/summary", params={"language": code}, headers=admin)
        assert response.status_code == 200
        assert response.json()["language"] == code
        assert name in services.gemini.prompts[-1][0]


def test_document_summary_respects_access_and_language_selection(client, admin, make_patient, make_user, upload, services):
    doc = upload(make_patient()["id"], ["React frontend"])
    other, _ = make_user(role="patient")
    path = f"/api/documents/{doc['id']}/summary"
    before = len(services.gemini.prompts)
    assert client.get(path, params={"language": "en-IN"}, headers=other).status_code == 404
    assert client.get(path, params={"language": "en-IN"}).status_code == 401
    assert client.get(path, headers=admin).status_code == 422
    assert client.get(path, params={"language": "xx-IN"}, headers=admin).status_code == 422
    assert len(services.gemini.prompts) == before


def test_document_summary_blocks_pending_and_empty_documents(client, admin, make_patient, upload, db):
    doc = upload(make_patient()["id"], ["React frontend"])
    source = db.get(Document, doc["id"])
    source.status = "extracting"
    db.commit()
    path = f"/api/documents/{doc['id']}/summary?language=en-IN"
    assert client.get(path, headers=admin).status_code == 409
    source.status, source.text = "validated", ""
    db.commit()
    assert client.get(path, headers=admin).status_code == 422


def test_generation_failure_does_not_save_empty_summary(client, admin, make_patient, upload, services, db, monkeypatch):
    doc = upload(make_patient()["id"], ["React frontend"])
    monkeypatch.setattr(services.gemini, "generate_json", lambda *args: {"document_summary": ""})
    assert client.get(f"/api/documents/{doc['id']}/summary?language=en-IN", headers=admin).status_code == 502
    assert list(db.scalars(select(DocumentSummary))) == []


def test_unsupported_audio_is_explicit_not_english(client, admin, services):
    response = client.post("/api/voice/tts", json={"text": "নমস্কাৰ", "language": "as-IN"}, headers=admin)
    assert response.status_code == 422
    assert "not available" in response.json()["detail"]
    assert services.sarvam.tts_calls == []


def test_document_deletion_removes_cached_summaries(client, admin, make_patient, upload, db):
    doc = upload(make_patient()["id"], ["React frontend"])
    assert client.get(f"/api/documents/{doc['id']}/summary?language=en-IN", headers=admin).status_code == 200
    assert client.delete(f"/api/documents/{doc['id']}", headers=admin).status_code == 204
    assert list(db.scalars(select(DocumentSummary))) == []


def test_pending_medication_is_removed_before_summary_and_invalidates_cache(client, admin, make_patient, upload, db, services):
    doc = upload(make_patient()["id"], ["Prescription overview"])
    source = db.get(Document, doc["id"])
    source.text = "BP=130/90\nT. UnclearBrand 100 AC\nFollow up in 1 month"
    record = ClinicalRecord(patient_id=source.patient_id, document_id=source.id, kind="medication",
                            name="UnclearBrand", dose="100", frequency="AC", status="verified",
                            source_text="T. UnclearBrand 100 AC")
    db.add(record)
    db.commit()
    path = f"/api/documents/{doc['id']}/summary?language=hi-IN"
    assert client.get(path, headers=admin).status_code == 200
    assert "UnclearBrand" in services.gemini.prompts[-1][1]
    record.status = "needs_review"
    db.commit()
    response = client.get(path, headers=admin)
    assert response.status_code == 200
    assert "UnclearBrand" not in services.gemini.prompts[-1][1]
    assert "100" not in services.gemini.prompts[-1][1]
    assert "BP=130/90" in services.gemini.prompts[-1][1]
    assert "खुराक स्पष्ट नहीं" in response.json()["summary"]


def test_missing_medication_evidence_uses_verified_facts_only(client, admin, make_patient, upload, db, services):
    doc = upload(make_patient()["id"], ["Prescription overview"])
    source = db.get(Document, doc["id"])
    source.text = "T. UnclearBrand 100 AC"
    db.add(ClinicalRecord(patient_id=source.patient_id, document_id=source.id, kind="medication",
                          name="UnclearBrand", dose="100", status="needs_review", source_text=None))
    db.commit()
    response = client.get(f"/api/documents/{doc['id']}/summary?language=en-IN", headers=admin)
    assert response.status_code == 200
    assert "UnclearBrand" not in services.gemini.prompts[-1][1]
    assert "100" not in services.gemini.prompts[-1][1]
    assert "Some medication entries need review" in response.json()["summary"]

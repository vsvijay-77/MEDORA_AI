"""HTTP API behaviour (FastAPI TestClient, offline AI fakes, real SQLite + in-memory Qdrant)."""
import base64
import io
import json
import wave

from helpers import LAB_REPORT_1, LAB_REPORT_2, make_pdf, make_wav


def test_health(client):
    assert client.get("/health").json() == {"status": "ok", "mock_external": True}


def test_me(client, admin):
    assert client.get("/api/me", headers=admin).json()["role"] == "admin"


class TestPatients:
    def test_create_list_get(self, client, admin, make_patient):
        p = make_patient()
        assert client.get(f"/api/patients/{p['id']}", headers=admin).json()["name"] == "Asha Rao"
        assert [x["id"] for x in client.get("/api/patients", headers=admin).json()] == [p["id"]]

    def test_future_birth_date_rejected(self, client, admin):
        assert client.post("/api/patients", json={"name": "X", "birth_date": "2099-01-01"}, headers=admin).status_code == 422

    def test_clinician_sees_only_own_patients(self, client, make_user, make_patient):
        c1, _ = make_user("clinician")
        c2, _ = make_user("clinician")
        p1 = make_patient(name="One", headers=c1)
        make_patient(name="Two", headers=c2)
        assert [p["id"] for p in client.get("/api/patients", headers=c1).json()] == [p1["id"]]

    def test_delete_patient_removes_vectors_and_files(self, client, admin, make_patient, upload, services, settings):
        from pathlib import Path

        p = make_patient()
        upload(p["id"], LAB_REPORT_1)
        assert services.vectors.count(p["id"]) == 12
        assert client.delete(f"/api/patients/{p['id']}", headers=admin).status_code == 204
        assert services.vectors.count(p["id"]) == 0
        assert not any(Path(settings.upload_dir).rglob("*.pdf"))
        assert client.get(f"/api/patients/{p['id']}", headers=admin).status_code == 404


class TestDocuments:
    def test_upload_processes_document(self, client, admin, make_patient, upload):
        p = make_patient()
        doc = upload(p["id"], LAB_REPORT_1, filename="cbc march.pdf")
        assert doc["status"] == "validated" and doc["filename"] == "cbc march.pdf" and doc["mime_type"] == "application/pdf"
        docs = client.get(f"/api/patients/{p['id']}/documents", headers=admin).json()
        assert len(docs) == 1

    def test_same_file_is_deduplicated(self, client, admin, make_patient, upload):
        p = make_patient()
        a = upload(p["id"], LAB_REPORT_1)
        b = upload(p["id"], LAB_REPORT_1)
        assert a["id"] == b["id"]

    def test_delete_document_removes_its_records(self, client, admin, make_patient, upload, services):
        p = make_patient()
        d = upload(p["id"], LAB_REPORT_1)
        assert client.delete(f"/api/documents/{d['id']}", headers=admin).status_code == 204
        assert client.get(f"/api/patients/{p['id']}/records", headers=admin).json() == []
        assert services.vectors.count(p["id"]) == 0


class TestRecordsAndReview:
    def test_records_filters_and_timeline(self, client, admin, make_patient, upload):
        p = make_patient()
        upload(p["id"], LAB_REPORT_1)
        upload(p["id"], LAB_REPORT_2)
        recs = client.get(f"/api/patients/{p['id']}/records", headers=admin).json()
        assert {r["status"] for r in recs} == {"verified", "needs_review"}
        meds = client.get(f"/api/patients/{p['id']}/records", params={"kind": "medication"}, headers=admin).json()
        assert {m["name"] for m in meds} == {"Metformin", "Ferrous sulfate"}
        tl = client.get(f"/api/patients/{p['id']}/timeline", headers=admin).json()
        assert [g["date"] for g in tl] == ["2026-08-20", "2026-03-14"]
        assert client.get(f"/api/patients/{p['id']}/records", params={"kind": "bogus"}, headers=admin).status_code == 422

    def test_approve_with_correction_indexes_record(self, client, admin, make_patient, upload, services):
        p = make_patient()
        upload(p["id"], LAB_REPORT_2)
        [pending] = client.get(f"/api/patients/{p['id']}/records", params={"status": "needs_review"}, headers=admin).json()
        before = services.vectors.count(p["id"])
        r = client.post(f"/api/records/{pending['id']}/review", json={"action": "approve", "corrections": {"unit": "U/mL"}, "note": "checked vs lab"}, headers=admin)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "verified" and r.json()["unit"] == "U/mL" and r.json()["indexed"]
        assert services.vectors.count(p["id"]) == before + 1

    def test_approve_cannot_override_errors(self, client, admin, make_patient, upload):
        p = make_patient()
        upload(p["id"], LAB_REPORT_2)
        [pending] = client.get(f"/api/patients/{p['id']}/records", params={"status": "needs_review"}, headers=admin).json()
        r = client.post(f"/api/records/{pending['id']}/review", json={"action": "approve", "corrections": {"date": "2099-01-01"}}, headers=admin)
        assert r.status_code == 422 and r.json()["detail"]["issues"][0]["code"] == "future_date"

    def test_reject_unindexes(self, client, admin, make_patient, upload, services):
        p = make_patient()
        upload(p["id"], LAB_REPORT_1)
        hb = next(r for r in client.get(f"/api/patients/{p['id']}/records", headers=admin).json() if r["name"] == "Hemoglobin")
        r = client.post(f"/api/records/{hb['id']}/review", json={"action": "reject"}, headers=admin)
        assert r.json()["status"] == "rejected" and services.vectors.count(p["id"]) == 11

    def test_unsupported_correction_field(self, client, admin, make_patient, upload):
        p = make_patient()
        upload(p["id"], LAB_REPORT_2)
        [pending] = client.get(f"/api/patients/{p['id']}/records", params={"status": "needs_review"}, headers=admin).json()
        r = client.post(f"/api/records/{pending['id']}/review", json={"action": "approve", "corrections": {"status": "verified"}}, headers=admin)
        assert r.status_code == 422


class TestFhirApi:
    def test_bundle(self, client, admin, make_patient, upload):
        p = make_patient()
        upload(p["id"], LAB_REPORT_1)
        upload(p["id"], LAB_REPORT_2)
        r = client.get(f"/api/patients/{p['id']}/fhir", headers=admin)
        assert r.headers["content-type"].startswith("application/fhir+json")
        b = r.json()
        counts = {}
        for e in b["entry"]:
            counts[e["resource"]["resourceType"]] = counts.get(e["resource"]["resourceType"], 0) + 1
        assert counts == {"Patient": 1, "DocumentReference": 2, "Observation": 10, "MedicationStatement": 2,
                          "Condition": 2, "AllergyIntolerance": 1}


class TestSemanticSearchAndAsk:
    def test_search(self, client, admin, make_patient, upload):
        p = make_patient()
        upload(p["id"], LAB_REPORT_1)
        hits = client.get(f"/api/patients/{p['id']}/search", params={"q": "metformin medication"}, headers=admin).json()
        assert hits[0]["record"]["name"] == "Metformin"
        assert all(h["record"]["status"] == "verified" for h in hits)
        only_labs = client.get(f"/api/patients/{p['id']}/search", params={"q": "hemoglobin", "kind": "lab_result"}, headers=admin).json()
        assert {h["record"]["kind"] for h in only_labs} == {"lab_result"}
        recent = client.get(f"/api/patients/{p['id']}/search", params={"q": "hemoglobin", "date_from": "2026-06-01"}, headers=admin).json()
        assert recent == []

    def test_search_validation(self, client, admin, make_patient):
        p = make_patient()
        assert client.get(f"/api/patients/{p['id']}/search", params={"q": ""}, headers=admin).status_code == 422
        assert client.get(f"/api/patients/{p['id']}/search", params={"q": "x", "limit": 500}, headers=admin).status_code == 422

    def test_ask(self, client, admin, make_patient, upload):
        p = make_patient()
        upload(p["id"], LAB_REPORT_1)
        upload(p["id"], LAB_REPORT_2)
        a = client.post(f"/api/patients/{p['id']}/ask", json={"question": "What is my HbA1c?"}, headers=admin).json()
        assert a["grounded"] and a["citations"] and "HbA1c" in a["answer"]
        assert a["citations"][0]["label"] in a["answer"]
        assert "not medical advice" in a["disclaimer"]

    def test_ask_without_records(self, client, admin, make_patient):
        p = make_patient()
        a = client.post(f"/api/patients/{p['id']}/ask", json={"question": "hemoglobin?"}, headers=admin).json()
        assert a["insufficient_evidence"] and a["citations"] == []

    def test_ask_validation(self, client, admin, make_patient):
        p = make_patient()
        assert client.post(f"/api/patients/{p['id']}/ask", json={"question": ""}, headers=admin).status_code == 422
        assert client.post(f"/api/patients/{p['id']}/ask", json={"question": "x" * 1001}, headers=admin).status_code == 422
        assert client.post(f"/api/patients/{p['id']}/ask", json={"question": "x", "language": "klingon"}, headers=admin).status_code == 422


def _wav_frames(blob: bytes) -> int:
    with wave.open(io.BytesIO(blob)) as w:
        return w.getnframes()


class TestVoice:
    def test_summary_text_and_audio(self, client, admin, make_patient, upload, services):
        p = make_patient()
        upload(p["id"], LAB_REPORT_1)
        s = client.get(f"/api/patients/{p['id']}/summary", headers=admin).json()
        assert s["citations"] and "[R" in s["answer"]
        r = client.get(f"/api/patients/{p['id']}/summary/audio", headers=admin)
        assert r.status_code == 200 and r.headers["content-type"] == "audio/wav"
        assert _wav_frames(r.content) > 0
        spoken = " ".join(t for t, _ in services.sarvam.tts_calls)
        assert "[R" not in spoken and "not medical advice" in spoken

    def test_summary_audio_in_hindi(self, client, admin, make_patient, upload, services):
        p = make_patient()
        upload(p["id"], LAB_REPORT_1)
        client.get(f"/api/patients/{p['id']}/summary/audio", params={"language": "hi-IN"}, headers=admin)
        assert {lang for _, lang in services.sarvam.tts_calls} == {"hi-IN"}

    def test_voice_query_end_to_end(self, client, admin, make_patient, upload):
        p = make_patient()
        upload(p["id"], LAB_REPORT_1)
        r = client.post(f"/api/patients/{p['id']}/voice/query", headers=admin,
                        files={"audio": ("q.wav", make_wav(question="Which medication am I taking?"), "audio/wav")})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["transcript"] == "Which medication am I taking?" and body["detected_language"] == "en-IN"
        assert body["citations"] and ("Metformin" in body["answer"] or "Ferrous" in body["answer"])
        assert _wav_frames(base64.b64decode(body["audio_base64"])) > 0

    def test_voice_query_answers_in_detected_language(self, client, admin, make_patient, upload, services):
        p = make_patient()
        upload(p["id"], LAB_REPORT_1)
        services.sarvam.tts_calls.clear()
        body = client.post(f"/api/patients/{p['id']}/voice/query", headers=admin,
                           files={"audio": ("q.wav", make_wav(question="hemoglobin kitna tha", lang="hi-IN"), "audio/wav")}).json()
        assert body["language"] == "hi-IN"
        assert services.sarvam.tts_calls[-1][1] == "hi-IN"

    def test_voice_query_without_speech_output(self, client, admin, make_patient, upload):
        p = make_patient()
        upload(p["id"], LAB_REPORT_1)
        body = client.post(f"/api/patients/{p['id']}/voice/query", headers=admin, data={"speak": "false"},
                           files={"audio": ("q.wav", make_wav(), "audio/wav")}).json()
        assert body["audio_base64"] is None and body["transcript"]

    def test_transcribe_and_tts(self, client, admin):
        t = client.post("/api/voice/transcribe", headers=admin, files={"audio": ("q.wav", make_wav(question="hello there"), "audio/wav")})
        assert t.json()["transcript"] == "hello there"
        r = client.post("/api/voice/tts", json={"text": "Hello.", "language": "en-IN"}, headers=admin)
        assert r.headers["content-type"] == "audio/wav"

    def test_empty_transcript_rejected(self, client, admin, make_patient, monkeypatch, services):
        from app.services.sarvam import Transcript

        p = make_patient()
        monkeypatch.setattr(services.sarvam, "transcribe", lambda *a, **k: Transcript("", None))
        r = client.post(f"/api/patients/{p['id']}/voice/query", headers=admin, files={"audio": ("q.wav", make_wav(), "audio/wav")})
        assert r.status_code == 422

    def test_upstream_failure_is_502_with_safe_message(self, client, admin, make_patient, monkeypatch, services):
        from app.services.http import ExternalServiceError

        p = make_patient()

        def boom(*a, **k):
            raise ExternalServiceError("Sarvam STT", "HTTP 503", 503)

        monkeypatch.setattr(services.sarvam, "transcribe", boom)
        r = client.post(f"/api/patients/{p['id']}/voice/query", headers=admin, files={"audio": ("q.wav", make_wav(), "audio/wav")})
        assert r.status_code == 502 and r.json()["detail"] == "Sarvam STT is unavailable right now (HTTP 503)."


class TestAdmin:
    def test_force_reindex_restores_records_after_switching_vector_store(self, client, admin, make_patient, upload, services):
        p = make_patient()
        upload(p["id"], LAB_REPORT_1)
        services.vectors.delete_patient(p["id"])
        assert client.post("/api/admin/reindex", headers=admin).json() == {"indexed": 0}
        assert client.post("/api/admin/reindex?force=true", headers=admin).json() == {"indexed": 12}
        assert services.vectors.count(p["id"]) == 12

    def test_reindex(self, client, admin, make_patient, upload, services, db):
        from app.models import ClinicalRecord

        p = make_patient()
        upload(p["id"], LAB_REPORT_1)
        services.vectors.delete_patient(p["id"])
        db.query(ClinicalRecord).update({"indexed": False})
        db.commit()
        assert client.post("/api/admin/reindex", headers=admin).json() == {"indexed": 12}
        assert services.vectors.count(p["id"]) == 12

    def test_audit_trail(self, client, admin, make_patient, upload):
        p = make_patient()
        upload(p["id"], LAB_REPORT_1)
        client.post(f"/api/patients/{p['id']}/ask", json={"question": "hemoglobin"}, headers=admin)
        actions = [a["action"] for a in client.get(f"/api/patients/{p['id']}/audit", headers=admin).json()]
        assert {"patient.created", "document.uploaded", "document.processed", "ask"} <= set(actions)
        assert "10.2" not in json.dumps(client.get(f"/api/patients/{p['id']}/audit", headers=admin).json())  # no PHI values in audit

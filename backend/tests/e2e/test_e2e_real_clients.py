"""End-to-end journey with the REAL Sarvam/Gemini client code; only the network is simulated (respx).

Upload PDF -> Sarvam Doc AI (digitise/poll/results) -> Gemini extraction -> validation -> Postgres-compatible DB
-> Gemini embeddings -> Qdrant -> semantic search -> Gemini grounded answer -> Sarvam TTS; plus voice query via Sarvam STT.
"""
import base64
import io
import json
import re
import wave

import httpx
import pytest
import respx
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.main import create_app
from app.services.extraction import rule_based_extract
from app.services.fakes import hash_embed, silent_wav
from helpers import LAB_REPORT_1, make_pdf, make_wav

SARVAM = "https://api.sarvam.ai"
GEMINI = "https://generativelanguage.googleapis.com/v1beta"


class FakeUpstream:
    """Simulates Sarvam + Gemini HTTP APIs and records what MedChronicle sent them."""

    def __init__(self, dim: int):
        self.dim = dim
        self.calls: dict[str, int] = {}
        self.last_answer_prompt = ""
        self.stt_language = "hi-IN"
        self.gemini_down = False

    def hit(self, name):
        self.calls[name] = self.calls.get(name, 0) + 1

    # Sarvam ---------------------------------------------------------------
    def digitise(self, request):
        self.hit("digitise")
        assert request.headers["api-subscription-key"] == "sk_e2e"
        return httpx.Response(201, json={"job_id": "job-1", "status": "queued", "run_id": "r1"})

    def status(self, request):
        self.hit("status")
        return httpx.Response(200, json={"job_id": "job-1", "status": "completed" if self.calls["status"] > 1 else "running"})

    def results(self, request):
        self.hit("results")
        html = "".join(f"<p>{ln}</p>" for ln in LAB_REPORT_1)
        return httpx.Response(200, json={"type": "digitise", "status": "completed", "documents": [{"pages": [{"page_number": 1, "content": html}]}]})

    def stt(self, request):
        self.hit("stt")
        return httpx.Response(200, json={"transcript": "मेरा hemoglobin कितना था?", "language_code": self.stt_language})

    def tts(self, request):
        self.hit("tts")
        body = json.loads(request.content)
        assert "[R" not in body["text"] and len(body["text"]) <= 2500
        return httpx.Response(200, json={"audios": [base64.b64encode(silent_wav(0.2)).decode()]})

    # Gemini ---------------------------------------------------------------
    def generate(self, request):
        self.hit("generate")
        if self.gemini_down:
            return httpx.Response(503)
        assert request.headers["x-goog-api-key"] == "AQ.e2e-key-000000000000000000"
        body = json.loads(request.content)
        prompt = body["contents"][0]["parts"][0]["text"]
        schema = body["generationConfig"]["responseSchema"]["properties"]
        if "items" in schema:
            doc = re.search(r"<document>\n(.*)\n</document>", prompt, re.S).group(1)
            out = rule_based_extract(doc)
        elif "summary" in schema:
            recs = dict(re.findall(r"^\[(R\d+)\] (.+)$", prompt, re.M))
            out = {"summary": " ".join(f"{t} [{k}]" for k, t in list(recs.items())[:3]), "citations": list(recs)[:3]}
        else:
            self.last_answer_prompt = prompt
            recs = dict(re.findall(r"^\[(R\d+)\] (.+)$", prompt, re.M))
            label = next(k for k, t in recs.items() if "Hemoglobin" in t)
            value = re.search(r"Hemoglobin (\S+) g/dL", recs[label]).group(1)
            out = {"answer": f"आपका हीमोग्लोबिन {value} g/dL था, जो कम था [{label}].", "citations": [label], "insufficient_evidence": False}
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": json.dumps(out)}]}}]})

    def embed(self, request):
        self.hit("embed")
        reqs = json.loads(request.content)["requests"]
        return httpx.Response(200, json={"embeddings": [{"values": hash_embed(r["content"]["parts"][0]["text"], self.dim)} for r in reqs]})


@pytest.fixture
def e2e(settings, no_sleep):
    s = settings.model_copy(update={
        "mock_external": False, "sarvam_api_key": SecretStr("sk_e2e"), "gemini_api_key": SecretStr("AQ.e2e-key-000000000000000000"),
        "rag_score_threshold": 0.05,
    })
    up = FakeUpstream(s.embedding_dim)
    with respx.mock(assert_all_called=False) as router:
        router.post(f"{SARVAM}/doc-ai/v1/job/digitise").mock(side_effect=up.digitise)
        router.get(f"{SARVAM}/doc-ai/v1/job/job-1/status").mock(side_effect=up.status)
        router.get(f"{SARVAM}/doc-ai/v1/job/job-1/results").mock(side_effect=up.results)
        router.post(f"{SARVAM}/speech-to-text").mock(side_effect=up.stt)
        router.post(f"{SARVAM}/text-to-speech").mock(side_effect=up.tts)
        router.post(url__regex=rf"{re.escape(GEMINI)}/models/.+:generateContent").mock(side_effect=up.generate)
        router.post(url__regex=rf"{re.escape(GEMINI)}/models/.+:batchEmbedContents").mock(side_effect=up.embed)
        router.route(host="testserver").pass_through()
        app = create_app(s)
        with TestClient(app) as c:
            yield c, up


def test_full_patient_journey(e2e, admin):
    c, up = e2e

    # 1. clinician onboarding
    r = c.post("/api/users", json={"name": "Dr Iyer", "role": "clinician"}, headers=admin)
    doc_h = {"Authorization": f"Bearer {r.json()['api_key']}"}
    p = c.post("/api/patients", json={"name": "Asha Rao", "birth_date": "1974-05-02", "sex": "female"}, headers=doc_h).json()

    # 2. upload -> Doc AI -> extraction -> validation -> DB -> Qdrant
    r = c.post(f"/api/patients/{p['id']}/documents", headers=doc_h, files={"file": ("cbc.pdf", make_pdf(LAB_REPORT_1), "application/pdf")})
    assert r.status_code == 202
    doc = c.get(f"/api/documents/{r.json()['id']}", headers=doc_h).json()
    assert doc["status"] == "validated", doc
    assert up.calls["digitise"] == 1 and up.calls["status"] == 2 and up.calls["results"] == 1

    recs = c.get(f"/api/patients/{p['id']}/records", headers=doc_h).json()
    assert len(recs) == 12 and all(r["status"] == "verified" and r["indexed"] for r in recs)

    # 3. FHIR
    bundle = c.get(f"/api/patients/{p['id']}/fhir", headers=doc_h).json()
    assert len(bundle["entry"]) == 1 + 1 + 12

    # 4. semantic search
    hits = c.get(f"/api/patients/{p['id']}/search", params={"q": "metformin"}, headers=doc_h).json()
    assert hits[0]["record"]["name"] == "Metformin"

    # 5. patient gets access and asks by voice (Hindi) -> STT -> RAG -> TTS
    r = c.post("/api/users", json={"name": "Asha", "role": "patient", "patient_ids": [p["id"]]}, headers=admin)
    pat_h = {"Authorization": f"Bearer {r.json()['api_key']}"}
    v = c.post(f"/api/patients/{p['id']}/voice/query", headers=pat_h, files={"audio": ("q.webm", make_wav(), "audio/wav")}).json()
    assert v["transcript"] == "मेरा hemoglobin कितना था?" and v["language"] == "hi-IN"
    assert "10.2" in v["answer"] and v["grounded"] and v["citations"][0]["text"].startswith("Lab result: Hemoglobin 10.2")
    assert "Write the answer in" not in up.last_answer_prompt  # system rules travel in systemInstruction, not the user turn
    with wave.open(io.BytesIO(base64.b64decode(v["audio_base64"]))) as w:
        assert w.getnframes() > 0

    # 6. spoken health summary
    a = c.get(f"/api/patients/{p['id']}/summary/audio", headers=pat_h)
    assert a.status_code == 200 and a.headers["content-type"] == "audio/wav"

    # 7. the patient cannot review records
    assert c.post(f"/api/records/{recs[0]['id']}/review", json={"action": "reject"}, headers=pat_h).status_code == 403
    assert up.calls["embed"] >= 3 and up.calls["tts"] >= 2 and up.calls["stt"] == 1


def test_upstream_outage_degrades_gracefully(e2e, admin):
    c, up = e2e
    p = c.post("/api/patients", json={"name": "B"}, headers=admin).json()
    c.post(f"/api/patients/{p['id']}/documents", headers=admin, files={"file": ("cbc.pdf", make_pdf(LAB_REPORT_1), "application/pdf")})
    up.gemini_down = True
    # Summary still works via the deterministic fallback
    s = c.get(f"/api/patients/{p['id']}/summary", headers=admin).json()
    assert s["answer"].startswith("Conditions:") and s["guard_notes"]
    # Q&A surfaces a clean 502 after bounded retries
    before = up.calls["generate"]
    r = c.post(f"/api/patients/{p['id']}/ask", json={"question": "hemoglobin"}, headers=admin)
    assert r.status_code == 502 and "Gemini" in r.json()["detail"]
    assert up.calls["generate"] - before == 3

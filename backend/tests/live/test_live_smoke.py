"""Live smoke tests against the REAL Sarvam, Gemini and Qdrant services.

Skipped unless RUN_LIVE=1 and keys are present in the environment / .env. They create a throwaway
Qdrant collection and delete it afterwards. Run:  RUN_LIVE=1 pytest tests/live -v
"""
import os
import uuid

import pytest

from app.config import Settings
from helpers import make_pdf

pytestmark = pytest.mark.skipif(os.getenv("RUN_LIVE") != "1", reason="set RUN_LIVE=1 to call real services")


@pytest.fixture(scope="module")
def live():
    s = Settings()
    missing = [k for k in ("sarvam_api_key", "gemini_api_key") if not getattr(s, k).get_secret_value()]
    if missing or s.qdrant_url == ":memory:":
        pytest.skip(f"missing live config: {missing or 'QDRANT_URL'}")
    return s


def test_gemini_embedding_and_generation(live):
    from app.services.gemini import GeminiClient

    g = GeminiClient(live)
    [v] = g.embed(["Hemoglobin 10.2 g/dL"], task_type="RETRIEVAL_DOCUMENT")
    assert len(v) == live.embedding_dim
    out = g.generate_json("Reply with JSON.", 'Return {"ok": true}', {"type": "OBJECT", "properties": {"ok": {"type": "BOOLEAN"}}, "required": ["ok"]})
    assert out["ok"] is True


def test_sarvam_tts_then_stt_roundtrip(live):
    from app.services.sarvam import SarvamClient

    s = SarvamClient(live)
    wav = s.synthesize("What was my hemoglobin in March?", "en-IN")
    assert wav[:4] == b"RIFF"
    t = s.transcribe(wav, "q.wav", "audio/wav", "en-IN")
    assert "hemoglobin" in t.text.lower() or "haemoglobin" in t.text.lower()


def test_sarvam_document_ai(live):
    from app.services.sarvam import SarvamClient

    _, text = SarvamClient(live).digitise(make_pdf(["Report Date: 14/03/2026", "Hemoglobin: 10.2 g/dL (12.0-15.5)"]), "smoke.pdf", "application/pdf")
    assert "10.2" in text


def test_qdrant_roundtrip(live):
    from datetime import date

    from app.models import ClinicalRecord
    from app.services.vector_store import VectorStore

    vs = VectorStore(live.qdrant_url, live.qdrant_api_key.get_secret_value(), f"smoke_{uuid.uuid4().hex[:8]}", 8)
    vs.ensure_collection()
    try:
        r = ClinicalRecord(id=str(uuid.uuid4()), patient_id="smoke", kind="lab_result", name="Hemoglobin", value_num=10.2,
                           unit="g/dL", effective_date=date(2026, 3, 14), status="verified", document_id=None)
        vs.upsert([r], ["x"], [[1.0] + [0.0] * 7])
        assert vs.search("smoke", [1.0] + [0.0] * 7)[0].record_id == r.id
        assert vs.search("someone-else", [1.0] + [0.0] * 7) == []
    finally:
        vs.client.delete_collection(vs.collection)

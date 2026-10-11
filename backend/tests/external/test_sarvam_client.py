"""Real SarvamClient against respx-mocked HTTP: verifies wire format, polling, retries and error mapping."""
import base64
import io
import json
import wave

import httpx
import pytest
import respx

from app.config import Settings
from app.services.fakes import silent_wav
from app.services.http import ExternalServiceError
from app.services.sarvam import SarvamClient

BASE = "https://api.sarvam.ai"
KEY = "sk_test_key_123456"


@pytest.fixture
def client(no_sleep):
    s = Settings(_env_file=None, sarvam_api_key=KEY, sarvam_docai_poll_seconds=0, sarvam_tts_max_chars=60, http_max_retries=3)
    return SarvamClient(s)


def _form_fields(request: httpx.Request) -> str:
    return request.content.decode("latin-1")


class TestDocumentAI:
    @respx.mock
    def test_digitise_reads_live_block_format_in_reading_order(self, client):
        respx.post(f"{BASE}/doc-ai/v1/job/digitise").mock(return_value=httpx.Response(201, json={"job_id": "blocks", "status": "completed"}))
        respx.get(f"{BASE}/doc-ai/v1/job/blocks/results").mock(return_value=httpx.Response(200, json={
            "documents": [{"pages": [
                {"page_num": 2, "blocks": [{"text": "Rx: Metformin 500 mg BD", "reading_order": 1}]},
                {"page_num": 1, "blocks": [
                    {"text": "<p>Hemoglobin: 10.2 g/dL</p>", "reading_order": 2},
                    {"text": "Report Date: 14/03/2026", "reading_order": 1},
                    {"text": "An imagined description of a logo", "layout_tag": "image", "reading_order": 3},
                ]},
            ]}],
        }))
        _, text = client.digitise(b"%PDF", "report.pdf", "application/pdf")
        assert text == "Report Date: 14/03/2026\nHemoglobin: 10.2 g/dL\n\nRx: Metformin 500 mg BD"

    @respx.mock
    def test_digitise_polls_until_complete_and_flattens_pages(self, client):
        start = respx.post(f"{BASE}/doc-ai/v1/job/digitise").mock(return_value=httpx.Response(201, json={"job_id": "j1", "status": "queued", "run_id": "r"}))
        status = respx.get(f"{BASE}/doc-ai/v1/job/j1/status").mock(side_effect=[
            httpx.Response(200, json={"job_id": "j1", "status": "running"}),
            httpx.Response(200, json={"job_id": "j1", "status": "completed"}),
        ])
        respx.get(f"{BASE}/doc-ai/v1/job/j1/results").mock(return_value=httpx.Response(200, json={
            "type": "digitise", "status": "completed", "job_id": "j1",
            "documents": [{"file_name": "r.pdf", "pages": [
                {"page_number": 2, "content": "<p>Rx: Metformin 500 mg BD</p>"},
                {"page_number": 1, "content": "<table><tr><td>Hemoglobin</td><td>10.2 g/dL</td></tr></table>"},
            ]}]}))
        job, text = client.digitise(b"%PDF-1.4 x", "r.pdf", "application/pdf")
        assert job == "j1"
        assert text == "Hemoglobin | 10.2 g/dL\n\nRx: Metformin 500 mg BD"  # pages ordered
        assert status.call_count == 2
        req = start.calls[0].request
        assert req.headers["api-subscription-key"] == KEY
        body = _form_fields(req)
        assert 'name="output_format"' in body and "md" in body and 'filename="r.pdf"' in body

    @respx.mock
    @pytest.mark.parametrize("terminal", ["failed", "rejected"])
    def test_failed_job_raises(self, client, terminal):
        respx.post(f"{BASE}/doc-ai/v1/job/digitise").mock(return_value=httpx.Response(201, json={"job_id": "j2", "status": "queued", "run_id": "r"}))
        respx.get(f"{BASE}/doc-ai/v1/job/j2/status").mock(return_value=httpx.Response(200, json={"status": terminal}))
        with pytest.raises(ExternalServiceError, match=terminal):
            client.digitise(b"%PDF", "r.pdf", "application/pdf")

    @respx.mock
    def test_empty_results_raise(self, client):
        respx.post(f"{BASE}/doc-ai/v1/job/digitise").mock(return_value=httpx.Response(201, json={"job_id": "j3", "status": "completed", "run_id": "r"}))
        respx.get(f"{BASE}/doc-ai/v1/job/j3/results").mock(return_value=httpx.Response(200, json={"documents": [{"pages": [{"content": "  "}]}]}))
        with pytest.raises(ExternalServiceError, match="no text"):
            client.digitise(b"%PDF", "r.pdf", "application/pdf")

    @respx.mock
    def test_poll_timeout(self, no_sleep):
        c = SarvamClient(Settings(sarvam_api_key=KEY, sarvam_docai_poll_seconds=0, sarvam_docai_timeout_seconds=-1))
        respx.post(f"{BASE}/doc-ai/v1/job/digitise").mock(return_value=httpx.Response(201, json={"job_id": "j4", "status": "running", "run_id": "r"}))
        with pytest.raises(ExternalServiceError, match="timed out"):
            c.digitise(b"%PDF", "r.pdf", "application/pdf")


class TestRetries:
    @respx.mock
    def test_retries_on_429_then_succeeds(self, client):
        route = respx.post(f"{BASE}/speech-to-text").mock(side_effect=[
            httpx.Response(429, headers={"retry-after": "1"}), httpx.Response(503),
            httpx.Response(200, json={"transcript": "hello", "language_code": "en-IN"})])
        assert client.transcribe(b"RIFF", "q.wav", "audio/wav").text == "hello"
        assert route.call_count == 3

    @respx.mock
    def test_gives_up_after_max_retries(self, client):
        route = respx.post(f"{BASE}/speech-to-text").mock(return_value=httpx.Response(500, text="secret patient text"))
        with pytest.raises(ExternalServiceError) as ei:
            client.transcribe(b"RIFF", "q.wav", "audio/wav")
        assert route.call_count == 3
        assert "secret patient text" not in ei.value.safe_message  # upstream body never echoed

    @respx.mock
    def test_no_retry_on_client_error(self, client):
        route = respx.post(f"{BASE}/speech-to-text").mock(return_value=httpx.Response(403))
        with pytest.raises(ExternalServiceError, match="403"):
            client.transcribe(b"RIFF", "q.wav", "audio/wav")
        assert route.call_count == 1

    @respx.mock
    def test_network_errors_retried(self, client):
        route = respx.post(f"{BASE}/speech-to-text").mock(side_effect=[httpx.ConnectError("x"), httpx.ReadTimeout("y"),
                                                                       httpx.Response(200, json={"transcript": "ok"})])
        assert client.transcribe(b"RIFF", "q.wav", "audio/wav").text == "ok"
        assert route.call_count == 3


class TestSpeech:
    @respx.mock
    @pytest.mark.parametrize("language,speaker", [("en-IN", "ishita"), ("hi-IN", "priya"), ("te-IN", "neha"), ("xx-IN", "ishita")])
    def test_tts_selects_voice_for_language(self, client, language, speaker):
        wav = base64.b64encode(silent_wav()).decode()
        route = respx.post(f"{BASE}/text-to-speech").mock(return_value=httpx.Response(200, json={"audios": [wav]}))
        client.synthesize("Sample.", language)
        assert json.loads(route.calls[0].request.content)["speaker"] == speaker

    @respx.mock
    def test_tts_honours_explicit_voice(self, client):
        client.s.sarvam_tts_speaker = "priya"
        wav = base64.b64encode(silent_wav()).decode()
        route = respx.post(f"{BASE}/text-to-speech").mock(return_value=httpx.Response(200, json={"audios": [wav]}))
        client.synthesize("Sample.", "en-IN")
        assert json.loads(route.calls[0].request.content)["speaker"] == "priya"

    @respx.mock
    def test_stt_wire_format(self, client):
        route = respx.post(f"{BASE}/speech-to-text").mock(return_value=httpx.Response(200, json={
            "request_id": "x", "transcript": " मेरा हीमोग्लोबिन कितना था? ", "language_code": "hi-IN"}))
        t = client.transcribe(b"RIFF....WAVE", "q.wav", "audio/wav")
        assert t.text == "मेरा हीमोग्लोबिन कितना था?" and t.language_code == "hi-IN"
        body = _form_fields(route.calls[0].request)
        for field, val in (("model", "saaras:v3"), ("mode", "transcribe"), ("language_code", "unknown")):
            assert f'name="{field}"' in body and val in body

    @respx.mock
    def test_tts_chunks_and_concatenates(self, client):
        wav = base64.b64encode(silent_wav(0.1, 8000)).decode()
        route = respx.post(f"{BASE}/text-to-speech").mock(return_value=httpx.Response(200, json={"audios": [wav]}))
        text = "Your hemoglobin was 10.2 grams. It was low. Platelets were 250000 per microlitre. Keep your follow up."
        out = client.synthesize(text, "en-IN")
        payloads = [json.loads(c.request.content) for c in route.calls]
        assert len(payloads) >= 2 and all(len(p["text"]) <= 60 for p in payloads)
        assert payloads[0]["model"] == "bulbul:v3" and payloads[0]["speaker"] == "ishita" and payloads[0]["language_code"] == "en-IN"
        assert payloads[0]["pace"] == 0.9
        assert any("250,000" in p["text"] for p in payloads)
        with wave.open(io.BytesIO(out)) as w:
            assert w.getnframes() == 800 * len(payloads)

    @respx.mock
    def test_tts_unsupported_language_falls_back_to_english(self, client):
        wav = base64.b64encode(silent_wav(0.1)).decode()
        route = respx.post(f"{BASE}/text-to-speech").mock(return_value=httpx.Response(200, json={"audios": [wav]}))
        client.synthesize("Hello.", "xx-IN")
        assert json.loads(route.calls[0].request.content)["language_code"] == "en-IN"

    @respx.mock
    def test_tts_empty_audio_raises(self, client):
        respx.post(f"{BASE}/text-to-speech").mock(return_value=httpx.Response(200, json={"audios": []}))
        with pytest.raises(ExternalServiceError):
            client.synthesize("Hello.", "en-IN")

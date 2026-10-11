"""Real GeminiClient against respx-mocked HTTP."""
import json
import math

import httpx
import pytest
import respx

from app.config import Settings
from app.services.gemini import GeminiClient
from app.services.http import ExternalServiceError

BASE = "https://generativelanguage.googleapis.com/v1beta"
KEY = "AQ.test-key-abcdefghijklmnopqrstuvwxyz"


@pytest.fixture
def client(no_sleep):
    return GeminiClient(Settings(gemini_api_key=KEY, gemini_model="gemini-3.8-flash", embedding_dim=4))


def _gen(text, thought=None):
    parts = ([{"text": thought, "thought": True}] if thought else []) + [{"text": text}]
    return httpx.Response(200, json={"candidates": [{"content": {"parts": parts}}]})


@respx.mock
def test_generate_json_request_shape_and_skips_thoughts(client):
    route = respx.post(f"{BASE}/models/gemini-3.8-flash:generateContent").mock(return_value=_gen('{"answer": "ok"}', thought="thinking..."))
    out = client.generate_json("SYS", "PROMPT", {"type": "OBJECT"})
    assert out == {"answer": "ok"}
    req = route.calls[0].request
    body = json.loads(req.content)
    assert req.headers["x-goog-api-key"] == KEY
    assert body["systemInstruction"]["parts"][0]["text"] == "SYS"
    assert body["contents"][0]["parts"][0]["text"] == "PROMPT"
    assert body["generationConfig"] == {"temperature": 0.0, "responseMimeType": "application/json", "responseSchema": {"type": "OBJECT"}}
    assert KEY not in str(req.url)  # key travels in a header, never the URL


@respx.mock
@pytest.mark.parametrize("resp,match", [
    (httpx.Response(200, json={"candidates": [], "promptFeedback": {"blockReason": "SAFETY"}}), "SAFETY"),
    (_gen("not json"), "not valid JSON"),
    (_gen("[1,2]"), "not an object"),
    (httpx.Response(400, json={"error": "bad"}), "400"),
])
def test_generate_json_errors(client, resp, match):
    respx.post(f"{BASE}/models/gemini-3.8-flash:generateContent").mock(return_value=resp)
    with pytest.raises(ExternalServiceError, match=match):
        client.generate_json("s", "p", {})


@respx.mock
def test_embed_batches_and_normalises(client):
    def reply(request):
        n = len(json.loads(request.content)["requests"])
        return httpx.Response(200, json={"embeddings": [{"values": [3.0, 4.0, 0.0, 0.0]}] * n})

    route = respx.post(f"{BASE}/models/gemini-embedding-001:batchEmbedContents").mock(side_effect=reply)
    vecs = client.embed([f"t{i}" for i in range(150)], task_type="RETRIEVAL_DOCUMENT")
    assert len(vecs) == 150 and route.call_count == 2  # batches of 100
    assert vecs[0] == [0.6, 0.8, 0.0, 0.0]
    assert math.isclose(sum(x * x for x in vecs[-1]), 1.0)
    first = json.loads(route.calls[0].request.content)["requests"][0]
    assert first == {"model": "models/gemini-embedding-001", "content": {"parts": [{"text": "t0"}]},
                     "taskType": "RETRIEVAL_DOCUMENT", "outputDimensionality": 4}


@respx.mock
@pytest.mark.parametrize("payload,match", [({"embeddings": []}, "count mismatch"), ({"embeddings": [{"values": [1.0, 2.0]}]}, "dimension")])
def test_embed_validation(client, payload, match):
    respx.post(f"{BASE}/models/gemini-embedding-001:batchEmbedContents").mock(return_value=httpx.Response(200, json=payload))
    with pytest.raises(ExternalServiceError, match=match):
        client.embed(["x"], task_type="RETRIEVAL_QUERY")

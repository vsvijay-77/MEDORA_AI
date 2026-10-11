"""Gemini REST client: structured JSON generation and text embeddings.

  POST {base}/models/{model}:generateContent         (x-goog-api-key)
  POST {base}/models/{embed_model}:batchEmbedContents (taskType, outputDimensionality)
"""
from __future__ import annotations

import json
import math

import httpx

from ..config import Settings
from .http import ExternalServiceError, request_with_retry


def l2_normalize(v: list[float]) -> list[float]:
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n for x in v]


class GeminiClient:
    def __init__(self, settings: Settings, http: httpx.Client | None = None):
        self.s = settings
        self.http = http or httpx.Client(base_url=settings.gemini_base_url, timeout=settings.http_timeout_seconds)
        self.http.headers["x-goog-api-key"] = settings.gemini_api_key.get_secret_value()

    def generate_json(self, system: str, prompt: str, schema: dict, temperature: float = 0.0) -> dict:
        import re

        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": temperature, "responseMimeType": "application/json", "responseSchema": schema},
        }
        candidate_models = [self.s.gemini_model, "gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-3.6-flash"]
        models_to_try = list(dict.fromkeys(m for m in candidate_models if m))

        for idx, model in enumerate(models_to_try):
            is_last = (idx == len(models_to_try) - 1)
            try:
                r = request_with_retry(self.http, "Gemini", "POST", f"/models/{model}:generateContent",
                                       json=body, max_retries=1)
                data = r.json()
                cands = data.get("candidates") or []
                if not cands:
                    reason = (data.get("promptFeedback") or {}).get("blockReason", "no candidates")
                    raise ExternalServiceError("Gemini", f"empty response ({reason})")
                parts = (cands[0].get("content") or {}).get("parts") or []
                text = "".join(p.get("text", "") for p in parts if not p.get("thought")).strip()
                if text.startswith("```"):
                    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
                    text = re.sub(r"\s*```$", "", text)
                try:
                    out = json.loads(text)
                except json.JSONDecodeError:
                    raise ExternalServiceError("Gemini", "response was not valid JSON")
                if not isinstance(out, dict):
                    raise ExternalServiceError("Gemini", "response JSON was not an object")
                return out
            except ExternalServiceError as e:
                if (e.status in (404, 429, 503) or "429" in str(e) or "503" in str(e)) and not is_last:
                    continue
                raise

    def embed(self, texts: list[str], task_type: str) -> list[list[float]]:
        out: list[list[float]] = []
        model = f"models/{self.s.gemini_embedding_model}"
        for i in range(0, len(texts), 100):
            batch = texts[i : i + 100]
            body = {"requests": [{"model": model, "content": {"parts": [{"text": t}]}, "taskType": task_type,
                                  "outputDimensionality": self.s.embedding_dim} for t in batch]}
            r = request_with_retry(self.http, "Gemini embeddings", "POST",
                                   f"/models/{self.s.gemini_embedding_model}:batchEmbedContents",
                                   json=body, max_retries=self.s.http_max_retries)
            embs = r.json().get("embeddings") or []
            if len(embs) != len(batch):
                raise ExternalServiceError("Gemini embeddings", "embedding count mismatch")
            for e in embs:
                vec = e.get("values") or []
                if len(vec) != self.s.embedding_dim:
                    raise ExternalServiceError("Gemini embeddings", "unexpected embedding dimension")
                out.append(l2_normalize(vec))  # gemini-embedding-001 needs manual normalisation below 3072
        return out

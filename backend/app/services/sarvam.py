"""Sarvam AI clients: Document AI (digitise), Speech-to-Text (saaras) and Text-to-Speech (bulbul).

Contracts follow docs.sarvam.ai (checked Oct 2026):
  POST /doc-ai/v1/job/digitise   multipart file -> {job_id, status, run_id}
  GET  /doc-ai/v1/job/{id}/status -> {status: ... completed|partially_completed|failed|rejected}
  GET  /doc-ai/v1/job/{id}/results -> {documents: [{pages: [{page_num, blocks: [{text, reading_order}]}]}]}
  POST /speech-to-text           multipart file, model, mode, language_code -> {transcript, language_code}
  POST /text-to-speech           json {text, language_code, model, speaker} -> {audios: [base64 wav]}
Auth header: api-subscription-key
"""
from __future__ import annotations

import base64
import html
import io
import re
import time
import wave
from dataclasses import dataclass

import httpx

from ..config import Settings
from .http import ExternalServiceError, request_with_retry

TTS_LANGUAGES = {"en-IN", "hi-IN", "bn-IN", "ta-IN", "te-IN", "kn-IN", "ml-IN", "mr-IN", "gu-IN", "pa-IN", "od-IN"}
DOCAI_TERMINAL = {"completed", "partially_completed", "failed", "rejected"}
TTS_SPEAKERS = {
    "en-IN": "ishita", "hi-IN": "priya", "kn-IN": "ishita", "ta-IN": "ishita",
    "te-IN": "neha", "bn-IN": "roopa", "ml-IN": "pooja", "mr-IN": "priya",
    "gu-IN": "priya", "pa-IN": "roopa", "od-IN": "ritu",
}


@dataclass
class Transcript:
    text: str
    language_code: str | None


def html_to_text(content: str) -> str:
    """Digitise can return HTML; flatten it while keeping table rows on one line each."""
    if "<" not in content:
        return content
    t = re.sub(r"(?i)<\s*br\s*/?>", "\n", content)
    t = re.sub(r"(?i)</\s*(p|div|tr|h[1-6]|li)\s*>", "\n", t)
    t = re.sub(r"(?i)</\s*t[dh]\s*>", " | ", t)
    t = re.sub(r"<[^>]+>", "", t)
    t = html.unescape(t)
    lines = [re.sub(r"[ \t|]+$", "", re.sub(r"[ \t]+", " ", ln)).strip() for ln in t.splitlines()]
    return "\n".join(ln for ln in lines if ln)


def format_numbers_for_speech(text: str) -> str:
    """Sarvam TTS reads 5+ digit numbers best with thousands separators (10,000)."""
    return re.sub(r"(?<![\d.,])(\d{5,})(?![\d.,])", lambda m: f"{int(m.group(1)):,}", text)


def chunk_text(text: str, max_chars: int) -> list[str]:
    """Split on sentence boundaries so each chunk is within the TTS character limit."""
    text = text.strip()
    if len(text) <= max_chars:
        return [text] if text else []
    sentences = re.split(r"(?<=[.!?।])\s+", text)
    chunks, cur = [], ""
    for s in sentences:
        while len(s) > max_chars:  # pathological sentence: hard split on a space
            cut = s.rfind(" ", 0, max_chars)
            cut = cut if cut > 0 else max_chars
            if cur:
                chunks.append(cur)
                cur = ""
            chunks.append(s[:cut].strip())
            s = s[cut:].strip()
        if len(cur) + len(s) + 1 > max_chars:
            chunks.append(cur)
            cur = s
        else:
            cur = f"{cur} {s}".strip()
    if cur:
        chunks.append(cur)
    return [c for c in chunks if c]


def concat_wavs(wavs: list[bytes]) -> bytes:
    if len(wavs) == 1:
        return wavs[0]
    out = io.BytesIO()
    params = None
    with wave.open(out, "wb") as w:
        for blob in wavs:
            with wave.open(io.BytesIO(blob), "rb") as r:
                p = r.getparams()
                if params is None:
                    params = p
                    w.setparams(p)
                elif (p.nchannels, p.sampwidth, p.framerate) != (params.nchannels, params.sampwidth, params.framerate):
                    raise ExternalServiceError("Sarvam TTS", "inconsistent audio format between chunks")
                w.writeframes(r.readframes(r.getnframes()))
    return out.getvalue()


class SarvamClient:
    def __init__(self, settings: Settings, http: httpx.Client | None = None):
        self.s = settings
        self.http = http or httpx.Client(base_url=settings.sarvam_base_url, timeout=settings.http_timeout_seconds)
        self.http.headers["api-subscription-key"] = settings.sarvam_api_key.get_secret_value()

    def _req(self, service: str, method: str, path: str, **kw) -> httpx.Response:
        return request_with_retry(self.http, service, method, path, max_retries=self.s.http_max_retries, **kw)

    # ---------------- Document AI ----------------
    def digitise(self, content: bytes, filename: str, mime: str, language: str = "en-IN") -> tuple[str, str]:
        """Returns (job_id, plain text of all pages)."""
        r = self._req("Sarvam Document AI", "POST", "/doc-ai/v1/job/digitise",
                      files={"file": (filename, content, mime)},
                      data={"language": language, "output_format": "md"})
        job_id = r.json()["job_id"]
        deadline = time.monotonic() + self.s.sarvam_docai_timeout_seconds
        status = r.json().get("status", "")
        while status not in DOCAI_TERMINAL:
            if time.monotonic() > deadline:
                raise ExternalServiceError("Sarvam Document AI", "job timed out")
            time.sleep(self.s.sarvam_docai_poll_seconds)
            status = self._req("Sarvam Document AI", "GET", f"/doc-ai/v1/job/{job_id}/status").json()["status"]
        if status in {"failed", "rejected"}:
            raise ExternalServiceError("Sarvam Document AI", f"job {status}")
        res = self._req("Sarvam Document AI", "GET", f"/doc-ai/v1/job/{job_id}/results", params={"format": "json"}).json()
        pages: list[str] = []
        for doc in res.get("documents", []):
            for page in sorted(doc.get("pages", []), key=lambda p: p.get("page_num") or p.get("page_number") or 0):
                blocks = sorted(page.get("blocks") or [], key=lambda b: b.get("reading_order") or 0)
                content = "\n".join(html_to_text(block.get("text") or "") for block in blocks
                                    if block.get("layout_tag") not in {"image", "figure"})
                pages.append(content.strip() or html_to_text(page.get("content") or ""))
        text = "\n\n".join(p for p in pages if p.strip())
        if not text.strip():
            raise ExternalServiceError("Sarvam Document AI", "no text recognised in document")
        return job_id, text

    # ---------------- Speech-to-Text ----------------
    def transcribe(self, audio: bytes, filename: str, mime: str, language_code: str = "unknown") -> Transcript:
        r = self._req("Sarvam STT", "POST", "/speech-to-text",
                      files={"file": (filename, audio, mime)},
                      data={"model": self.s.sarvam_stt_model, "mode": "transcribe", "language_code": language_code})
        body = r.json()
        return Transcript(text=(body.get("transcript") or "").strip(), language_code=body.get("language_code"))

    # ---------------- Text-to-Speech ----------------
    def synthesize(self, text: str, language_code: str = "en-IN") -> bytes:
        lang = language_code if language_code in TTS_LANGUAGES else "en-IN"
        speaker = TTS_SPEAKERS[lang] if self.s.sarvam_tts_speaker == "auto" else self.s.sarvam_tts_speaker
        wavs: list[bytes] = []
        for chunk in chunk_text(format_numbers_for_speech(text), self.s.sarvam_tts_max_chars):
            r = self._req("Sarvam TTS", "POST", "/text-to-speech", json={
                "text": chunk, "language_code": lang, "model": self.s.sarvam_tts_model,
                "speaker": speaker, "pace": self.s.sarvam_tts_pace, "output_audio_codec": "wav",
            })
            audios = r.json().get("audios") or []
            if not audios:
                raise ExternalServiceError("Sarvam TTS", "empty audio response")
            wavs.extend(base64.b64decode(a) for a in audios)
        if not wavs:
            raise ExternalServiceError("Sarvam TTS", "nothing to synthesise")
        return concat_wavs(wavs)

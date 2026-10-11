"""Security primitives: API-key hashing, upload sniffing, filename sanitising, rate limiting, log redaction."""
from __future__ import annotations

import hashlib
import hmac
import logging
import re
import secrets
import threading
import time
import unicodedata
from collections import defaultdict, deque


def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def new_api_key() -> str:
    return "mc_" + secrets.token_urlsafe(32)


def constant_time_eq(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())


# --- Upload sniffing (never trust the client-supplied Content-Type) -----------------
DOCUMENT_SIGNATURES = {
    b"%PDF-": "application/pdf",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"\xff\xd8\xff": "image/jpeg",
}


def sniff_document(head: bytes) -> str | None:
    for sig, mime in DOCUMENT_SIGNATURES.items():
        if head.startswith(sig):
            return mime
    return None


def sniff_audio(head: bytes) -> str | None:
    if head[:4] == b"RIFF" and head[8:12] == b"WAVE":
        return "audio/wav"
    if head[:3] == b"ID3" or (len(head) > 1 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0):
        return "audio/mpeg"
    if head[:4] == b"OggS":
        return "audio/ogg"
    if head[:4] == b"\x1a\x45\xdf\xa3":
        return "audio/webm"
    if head[:4] == b"fLaC":
        return "audio/flac"
    if head[4:8] == b"ftyp":
        return "audio/mp4"
    return None


_SAFE_CHARS = re.compile(r"[^A-Za-z0-9._ -]+")


def sanitize_filename(name: str | None, default: str = "document") -> str:
    name = unicodedata.normalize("NFKC", name or "")
    name = name.replace("\\", "/").split("/")[-1]  # drop any path component
    name = _SAFE_CHARS.sub("_", name).strip(" .")
    name = re.sub(r"\.{2,}", ".", name)
    return (name or default)[:120]


# --- Rate limiting (per API key, sliding window, in-process) -----------------------
class RateLimiter:
    def __init__(self, per_minute: int):
        self.per_minute = per_minute
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str, now: float | None = None) -> bool:
        now = now if now is not None else time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > 60:
                q.popleft()
            if len(q) >= self.per_minute:
                return False
            q.append(now)
            return True


# --- Log redaction ------------------------------------------------------------------
_REDACTIONS = [
    (re.compile(r"(api-subscription-key|x-goog-api-key|api-key|authorization|x-api-key)(['\"]?\s*[:=]\s*['\"]?)([^\s'\",}]+)", re.I), r"\1\2[REDACTED]"),
    (re.compile(r"\b(sk_[A-Za-z0-9_]{8,}|AIza[0-9A-Za-z_\-]{20,}|AQ\.[A-Za-z0-9_\-]{20,}|mc_[A-Za-z0-9_\-]{20,})\b"), "[REDACTED]"),
    (re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b"), "[AADHAAR]"),
    (re.compile(r"(?<!\d)(?:\+91[\s-]?)?[6-9]\d{9}(?!\d)"), "[PHONE]"),
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "[EMAIL]"),
]


def redact(text: str) -> str:
    for pat, repl in _REDACTIONS:
        text = pat.sub(repl, text)
    return text


class RedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        # Redact in place, keeping the args structure: some formatters (e.g. uvicorn's access
        # formatter) unpack record.args positionally.
        if isinstance(record.msg, str):
            record.msg = redact(record.msg)
        if isinstance(record.args, tuple):
            record.args = tuple(redact(a) if isinstance(a, str) else a for a in record.args)
        elif isinstance(record.args, dict):
            record.args = {k: redact(v) if isinstance(v, str) else v for k, v in record.args.items()}
        return True


def install_log_redaction() -> None:
    f = RedactingFilter()
    for name in ("", "uvicorn", "uvicorn.access", "uvicorn.error", "httpx", "medchronicle"):
        lg = logging.getLogger(name)
        if not any(isinstance(x, RedactingFilter) for x in lg.filters):
            lg.addFilter(f)

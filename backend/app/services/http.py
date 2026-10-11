"""Shared HTTP plumbing for external services: timeouts, bounded retries, safe errors."""
from __future__ import annotations

import logging
import time

import httpx

log = logging.getLogger("medchronicle.http")

RETRY_STATUS = {408, 429, 500, 502, 503, 504}


class ExternalServiceError(Exception):
    """Raised when an upstream AI / vector service fails. Message is safe to show users."""

    def __init__(self, service: str, message: str, status: int | None = None):
        super().__init__(f"{service}: {message}")
        self.service = service
        self.status = status
        self.safe_message = f"{service} is unavailable right now ({message})."


def request_with_retry(
    client: httpx.Client, service: str, method: str, url: str, *, max_retries: int = 3,
    backoff: float = 0.5, **kwargs,
) -> httpx.Response:
    last: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            resp = client.request(method, url, **kwargs)
        except httpx.TimeoutException as e:
            last = ExternalServiceError(service, "timeout")
            log.warning("%s timeout on attempt %d", service, attempt)
        except httpx.TransportError as e:
            last = ExternalServiceError(service, "connection error")
            log.warning("%s transport error on attempt %d: %s", service, attempt, type(e).__name__)
        else:
            if resp.status_code < 400:
                return resp
            if resp.status_code in RETRY_STATUS and attempt < max_retries:
                retry_after = resp.headers.get("retry-after")
                wait = float(retry_after) if retry_after and retry_after.isdigit() else backoff * 2 ** (attempt - 1)
                log.warning("%s HTTP %d on attempt %d; retrying", service, resp.status_code, attempt)
                time.sleep(min(wait, 10))
                continue
            # Do not echo upstream bodies: they can contain request content (PHI).
            raise ExternalServiceError(service, f"HTTP {resp.status_code}", resp.status_code)
        if attempt < max_retries:
            time.sleep(backoff * 2 ** (attempt - 1))
    assert last is not None
    raise last

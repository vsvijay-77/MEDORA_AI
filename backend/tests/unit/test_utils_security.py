import io
import logging
import wave

import pytest

from app.security import RateLimiter, hash_api_key, redact, RedactingFilter, sanitize_filename, sniff_audio, sniff_document
from app.services.fakes import hash_embed, silent_wav, cosine
from app.services.gemini import l2_normalize
from app.services.sarvam import chunk_text, concat_wavs, format_numbers_for_speech, html_to_text
from helpers import make_pdf, make_wav


class TestTextForSpeech:
    def test_chunking_respects_limit_and_sentences(self):
        text = " ".join(f"Sentence number {i} is here." for i in range(200))
        chunks = chunk_text(text, 250)
        assert all(len(c) <= 250 for c in chunks)
        assert " ".join(chunks) == text
        assert all(c.endswith(".") for c in chunks)

    def test_chunking_hard_splits_long_sentence(self):
        chunks = chunk_text("word " * 300, 100)
        assert all(len(c) <= 100 for c in chunks) and len(chunks) >= 15

    def test_short_and_empty(self):
        assert chunk_text("Hi.", 100) == ["Hi."]
        assert chunk_text("   ", 100) == []

    def test_hindi_danda_boundary(self):
        assert chunk_text("पहला वाक्य। दूसरा वाक्य।", 12) == ["पहला वाक्य।", "दूसरा वाक्य।"]

    def test_number_formatting(self):
        assert format_numbers_for_speech("Platelets 250000 per uL, Hb 10.2, year 2026") == "Platelets 250,000 per uL, Hb 10.2, year 2026"

    def test_html_to_text(self):
        html = "<h1>Report</h1><table><tr><td>Hemoglobin</td><td>10.2</td></tr></table><p>A &amp; B</p>"
        assert html_to_text(html) == "Report\nHemoglobin | 10.2\nA & B"
        assert html_to_text("plain\ntext") == "plain\ntext"


class TestWav:
    def test_concat_preserves_frames(self):
        a, b = silent_wav(0.2, 8000), silent_wav(0.3, 8000)
        with wave.open(io.BytesIO(concat_wavs([a, b]))) as w:
            assert w.getnframes() == int(0.2 * 8000) + int(0.3 * 8000)

    def test_concat_rejects_mixed_rates(self):
        from app.services.http import ExternalServiceError

        with pytest.raises(ExternalServiceError):
            concat_wavs([silent_wav(0.1, 8000), silent_wav(0.1, 16000)])


class TestSniffing:
    def test_documents(self):
        assert sniff_document(make_pdf(["x"])[:16]) == "application/pdf"
        assert sniff_document(b"\x89PNG\r\n\x1a\n....") == "image/png"
        assert sniff_document(b"\xff\xd8\xff\xe0") == "image/jpeg"
        assert sniff_document(b"MZ\x90\x00 exe") is None
        assert sniff_document(b"<html><script>") is None

    @pytest.mark.parametrize("head,mime", [(make_wav()[:16], "audio/wav"), (b"ID3\x04....", "audio/mpeg"), (b"OggS\x00", "audio/ogg"),
                                           (b"\x1a\x45\xdf\xa3....", "audio/webm"), (b"fLaC....", "audio/flac"), (b"\x00\x00\x00\x20ftypM4A ", "audio/mp4"),
                                           (b"%PDF-1.4", None)])
    def test_audio(self, head, mime):
        assert sniff_audio(head) == mime


class TestSecurityPrimitives:
    @pytest.mark.parametrize("raw,clean", [("../../etc/passwd", "passwd"), ("C:\\Users\\x\\report.pdf", "report.pdf"), ("a<script>.pdf", "a_script_.pdf"),
                                           ("", "document"), ("...", "document"), ("x" * 300 + ".pdf", "x" * 120)])
    def test_sanitize_filename(self, raw, clean):
        assert sanitize_filename(raw) == clean

    def test_hash_is_stable_and_not_plaintext(self):
        assert hash_api_key("abc") == hash_api_key("abc") != "abc"
        assert len(hash_api_key("abc")) == 64

    def test_rate_limiter_window(self):
        rl = RateLimiter(2)
        assert rl.allow("u", 0) and rl.allow("u", 1)
        assert not rl.allow("u", 2)
        assert rl.allow("other", 2)
        assert rl.allow("u", 61.5)

    @pytest.mark.parametrize("raw,leaked", [
        ("api-subscription-key: sk_fake1234_NotARealSarvamKeyValue", "sk_fake1234"),
        ("x-goog-api-key=AQ.FakeGeminiKeyForTests000000000000000000", "AQ.FakeGemini"),
        ("Authorization: Bearer mc_abcdefghijklmnopqrstuvwxyz012345", "mc_abcdefghij"),
        ("call 9876543210", "9876543210"), ("aadhaar 1234 5678 9012", "5678"), ("mail a.b@example.com", "a.b@example.com"),
    ])
    def test_redaction(self, raw, leaked):
        assert leaked not in redact(raw)

    def test_log_filter_redacts(self, caplog):
        lg = logging.getLogger("medchronicle.test")
        lg.addFilter(RedactingFilter())
        with caplog.at_level(logging.INFO, logger="medchronicle.test"):
            lg.info("calling with key %s", "sk_fake1234_NotARealSarvamKeyValue")
        assert "sk_fake1234" not in caplog.text

    def test_log_filter_keeps_positional_args_for_access_logs(self):
        rec = logging.LogRecord("uvicorn.access", logging.INFO, "", 0, '%s - "%s %s HTTP/%s" %d',
                                ("127.0.0.1:1", "GET", "/api/me?key=mc_abcdefghijklmnopqrstuvwxyz0123", "1.1", 200), None)
        RedactingFilter().filter(rec)
        assert len(rec.args) == 5 and rec.args[4] == 200
        assert "mc_abcdefghij" not in rec.getMessage()


class TestEmbeddingMath:
    def test_l2_normalize(self):
        v = l2_normalize([3.0, 4.0])
        assert v == [0.6, 0.8]
        assert l2_normalize([0.0, 0.0]) == [0.0, 0.0]

    def test_fake_embedding_is_deterministic_and_semantic(self):
        a = hash_embed("Lab result: Hemoglobin 10.2 g/dL", 256)
        assert a == hash_embed("Lab result: Hemoglobin 10.2 g/dL", 256)
        assert cosine(hash_embed("what is my haemoglobin", 256), a) > cosine(hash_embed("metformin dose", 256), a)

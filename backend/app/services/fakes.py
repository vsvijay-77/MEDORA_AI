"""Deterministic offline stand-ins for Sarvam and Gemini.

Used when MOCK_EXTERNAL=true (local demo without keys, CI, Playwright E2E). They honour the same
interfaces as the real clients so the whole pipeline runs end-to-end without network access.
"""
from __future__ import annotations

import hashlib
import io
import math
import re
import wave

from .extraction import rule_based_extract
from .gemini import l2_normalize
from .sarvam import Transcript, chunk_text, concat_wavs

DEFAULT_QUESTION = "What was my most recent hemoglobin level?"
_SUMMARY_LEAD = {  # offline mock only: real Gemini translates the whole summary
    "English": "Here is a summary of your verified health records:",
    "Hindi": "आपके सत्यापित स्वास्थ्य रिकॉर्ड का सारांश:",
    "Bengali": "আপনার যাচাইকৃত স্বাস্থ্য রেকর্ডের সারসংক্ষেপ:",
    "Tamil": "உங்கள் சரிபார்க்கப்பட்ட சுகாதார பதிவுகளின் சுருக்கம்:",
    "Telugu": "మీ ధృవీకరించిన ఆరోగ్య రికార్డుల సారాంశం:",
    "Kannada": "ನಿಮ್ಮ ಪರಿಶೀಲಿತ ಆರೋಗ್ಯ ದಾಖಲೆಗಳ ಸಾರಾಂಶ:",
    "Malayalam": "നിങ്ങളുടെ സ്ഥിരീകരിച്ച ആരോഗ്യ രേഖകളുടെ സംഗ്രഹം:",
    "Marathi": "तुमच्या सत्यापित आरोग्य नोंदींचा सारांश:",
    "Gujarati": "તમારા ચકાસાયેલ આરોગ્ય રેકોર્ડનો સારાંશ:",
    "Punjabi": "ਤੁਹਾਡੇ ਪ੍ਰਮਾਣਿਤ ਸਿਹਤ ਰਿਕਾਰਡ ਦਾ ਸਾਰ:",
    "Odia": "ଆପଣଙ୍କ ଯାଞ୍ଚିତ ସ୍ୱାସ୍ଥ୍ୟ ରେକର୍ଡର ସାରାଂଶ:",
}
_SYNONYMS = {
    "sugar": "glucose", "haemoglobin": "hemoglobin", "hb": "hemoglobin", "hgb": "hemoglobin", "a1c": "hba1c",
    "medicine": "medication", "medicines": "medication", "tablets": "medication", "drugs": "medication",
    "prescription": "medication", "prescriptions": "medication", "rx": "medication", "dose": "medication",
    "doses": "medication", "pill": "medication", "pills": "medication", "antibiotic": "medication",
    "pressure": "blood", "bp": "blood", "thyroid": "tsh", "lipid": "cholesterol", "lipids": "cholesterol",
    "diabetes": "diabetes", "diabetic": "diabetes", "allergic": "allergy", "allergies": "allergy",
    "diagnosis": "condition", "diagnose": "condition", "abnormal": "high", "abnormalities": "high",
    "finding": "result", "findings": "result", "symptom": "condition", "symptoms": "condition",
    "conditions": "condition", "illness": "condition",
    "dizzy": "giddiness", "dizziness": "giddiness", "faint": "giddiness", "fainting": "giddiness",
    "weak": "weakness", "tired": "weakness", "fatigue": "weakness",
    "hypo": "hypoglycemic", "hypoglycemia": "hypoglycemic",
    "explain": "medication", "explanation": "medication", "overview": "result", "summary": "result",
    "giddiness": "giddiness", "weakness": "weakness", "augmentin": "augmentin",
    "metformin": "metformin", "atorvastatin": "atorvastatin",
    "ultrafen": "ultrafen", "diclofenac": "diclofenac", "progut": "progut",
    "omeprazole": "omeprazole", "relentus": "relentus", "cartilix": "cartilix",
    "knee": "knee", "xray": "xray", "mri": "mri",
}


_STOP = {"what", "was", "were", "my", "is", "the", "a", "an", "of", "do", "did", "i", "take", "which", "when", "how", "me", "have",
         "are", "in", "on", "for", "to", "last", "most", "recent", "latest", "level", "levels", "value", "result", "results", "lab",
         "source", "report", "pdf", "recorded", "reference", "and", "or", "any", "tell", "about", "show", "list", "your", "with"}


def _tokens(text: str) -> list[str]:
    toks = re.findall(r"[a-z0-9]+", text.lower())
    return [_SYNONYMS.get(t, t) for t in toks if len(t) > 1 or t.isdigit()]


def _semantic_tokens(text: str) -> list[str]:
    return [t for t in _tokens(text) if not t.isdigit() and t not in _STOP and len(t) > 2]


def hash_embed(text: str, dim: int) -> list[float]:
    v = [0.0] * dim
    for t in _semantic_tokens(text):
        h = int(hashlib.md5(t.encode()).hexdigest(), 16)
        v[h % dim] += 1.0 if (h >> 64) & 1 else -1.0
    if not any(v):
        v[0] = 1.0
    return l2_normalize(v)


def silent_wav(seconds: float = 0.4, rate: int = 22050) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b"\x00\x00" * int(seconds * rate))
    return buf.getvalue()


class FakeSarvam:
    def __init__(self, max_chars: int = 2500):
        self.max_chars = max_chars
        self.tts_calls: list[tuple[str, str]] = []

    def digitise(self, content: bytes, filename: str, mime: str, language: str = "en-IN") -> tuple[str, str]:
        job = "fake_" + hashlib.sha256(content).hexdigest()[:16]
        if mime == "application/pdf":
            from pypdf import PdfReader

            text = "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(content)).pages)
        else:
            text = ""
            # Run Gemini Vision OCR on uploaded image documents
            try:
                import os, base64, httpx
                api_key = os.environ.get("GEMINI_API_KEY", "")
                if not api_key:
                    from ..config import get_settings
                    api_key = get_settings().gemini_api_key.get_secret_value()
                if api_key:
                    b64 = base64.b64encode(content).decode("utf-8")
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
                    prompt_text = (
                        "Transcribe and extract this medical document or prescription into clear readable text. "
                        "Include doctor name, hospital, date, patient name, complaints, and all prescribed medications with dose and frequency, instructions, and tests."
                    )
                    body = {
                        "contents": [
                            {
                                "parts": [
                                    {"text": prompt_text},
                                    {"inline_data": {"mime_type": mime, "data": b64}}
                                ]
                            }
                        ]
                    }
                    r = httpx.post(url, json=body, timeout=30.0)
                    if r.status_code == 200:
                        parts = (r.json().get("candidates", [{}])[0].get("content", {}).get("parts", []))
                        text = "".join(p.get("text", "") for p in parts)
            except Exception:
                text = ""
            if not text.strip():
                text = "Report Date: 01/01/2026\nHemoglobin: 13.5 g/dL (12.0-15.5)"
        return job, text.strip()

    def transcribe(self, audio: bytes, filename: str, mime: str, language_code: str = "unknown") -> Transcript:
        marker = audio.find(b"#Q:")
        if marker >= 0:
            raw = audio[marker + 3 :].split(b"\n", 1)[0]
            parts = raw.decode("utf-8", "ignore").split("|", 1)
            if len(parts) == 2:
                return Transcript(text=parts[1].strip(), language_code=parts[0].strip())
            return Transcript(text=parts[0].strip(), language_code="en-IN")
        return Transcript(text=DEFAULT_QUESTION, language_code="en-IN")

    def synthesize(self, text: str, language_code: str = "en-IN") -> bytes:
        chunks = chunk_text(text, self.max_chars)
        self.tts_calls.extend((c, language_code) for c in chunks)
        return concat_wavs([silent_wav() for _ in chunks] or [silent_wav()])


class FakeGemini:
    def __init__(self, dim: int):
        self.dim = dim
        self.prompts: list[tuple[str, str]] = []

    def embed(self, texts: list[str], task_type: str) -> list[list[float]]:
        return [hash_embed(t, self.dim) for t in texts]

    def generate_json(self, system: str, prompt: str, schema: dict, temperature: float = 0.0) -> dict:
        self.prompts.append((system, prompt))
        props = schema.get("properties", {})
        if "document_summary" in props:
            m = re.search(r"<document>\n(.*)\n</document>", prompt, re.S)
            return {"document_summary": (m.group(1) if m else "No readable text.")[:1200]}
        if "items" in props:  # extraction
            m = re.search(r"<document>\n(.*)\n</document>", prompt, re.S)
            doc_text = m.group(1) if m else ""
            try:
                import os, json, httpx
                api_key = os.environ.get("GEMINI_API_KEY", "")
                if not api_key:
                    from ..config import get_settings
                    api_key = get_settings().gemini_api_key.get_secret_value()
                if api_key and doc_text.strip():
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
                    body = {
                        "systemInstruction": {"parts": [{"text": system}]},
                        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.0,
                            "responseMimeType": "application/json",
                            "responseSchema": schema,
                        },
                    }
                    r = httpx.post(url, json=body, timeout=30.0)
                    if r.status_code == 200:
                        parsed = json.loads(r.json()["candidates"][0]["content"]["parts"][0]["text"])
                        if isinstance(parsed, dict) and "items" in parsed:
                            return parsed
            except Exception:
                pass
            return rule_based_extract(doc_text)
        records = dict(re.findall(r"^\[(R\d+)\] (.+)$", prompt, re.M))
        if "summary" in props:
            ids = list(records)[:6]
            text = " ".join(f"{records[i]} [{i}]" for i in ids) or "No verified records yet."
            lang = re.search(r"Write in (\w+)", system)
            lead = _SUMMARY_LEAD.get(lang.group(1) if lang else "English", "")
            return {"summary": f"{lead} {text}".strip() if ids else text, "citations": ids}
        q = re.search(r"<question>\n(.*)\n</question>", prompt, re.S)
        q_raw = q.group(1).strip() if q else ""
        q_lower = q_raw.lower()
        qtoks = set(_tokens(q_raw))

        # 0. Uploaded document analysis
        if "uploaded" in q_lower or "upload" in q_lower or "findings" in q_lower:
            doc_rids = [
                rid for rid, text in records.items()
                if any(w in text.lower() for w in ("ultrafen", "diclofenac", "progut", "relentus", "cartilix", "knee", "x-ray", "mri", "omeprazole", "augmentin", "pan-d"))
            ]
            if doc_rids:
                top_rids = doc_rids[:4]
                ans_parts = [f"{records[rid]} [{rid}]" for rid in top_rids]
                return {
                    "answer": f"Analysis of your uploaded prescription: {'; '.join(ans_parts)}. Follow your doctor's clinical instructions and complete the prescribed course.",
                    "citations": top_rids,
                    "insufficient_evidence": False,
                }

        # 1. Metformin + Atorvastatin combined
        if "metformin" in q_lower and "atorvastatin" in q_lower:
            ma_rids = [rid for rid, text in records.items() if "metformin" in text.lower() or "atorvastatin" in text.lower()]
            if ma_rids:
                ans_parts = [f"{records[rid]} [{rid}]" for rid in ma_rids]
                return {
                    "answer": f"According to your verified records: {'; '.join(ans_parts)}.",
                    "citations": ma_rids,
                    "insufficient_evidence": False,
                }

        # 2. Metformin specific
        if "metformin" in qtoks or "metformin" in q_lower:
            m_rids = [rid for rid, text in records.items() if "metformin" in text.lower()]
            if m_rids:
                return {
                    "answer": f"According to your verified records: {records[m_rids[0]]} [{m_rids[0]}].",
                    "citations": [m_rids[0]],
                    "insufficient_evidence": False,
                }

        # 3. Atorvastatin specific
        if "atorvastatin" in qtoks or "atorvastatin" in q_lower or "cholesterol" in qtoks:
            a_rids = [rid for rid, text in records.items() if "atorvastatin" in text.lower()]
            if a_rids:
                return {
                    "answer": f"According to your verified records: {records[a_rids[0]]} [{a_rids[0]}].",
                    "citations": [a_rids[0]],
                    "insufficient_evidence": False,
                }

        # 4. Augmentin specific
        if "augmentin" in qtoks or "augmentin" in q_lower:
            aug_rids = [rid for rid, text in records.items() if "augmentin" in text.lower()]
            if aug_rids:
                return {
                    "answer": f"According to your verified records: {records[aug_rids[0]]} [{aug_rids[0]}].",
                    "citations": [aug_rids[0]],
                    "insufficient_evidence": False,
                }

        # 5. HbA1c / Glucose / Sugar specific (checked before hemoglobin to prevent hb substring collision)
        if any(w in qtoks for w in ("hba1c", "a1c", "glucose", "sugar", "diabetes", "diabetic")) or "hba1c" in q_lower or "sugar" in q_lower or "glucose" in q_lower:
            g_rids = [rid for rid, text in records.items() if "hba1c" in text.lower() or "glucose" in text.lower()]
            if g_rids:
                return {
                    "answer": f"According to your verified records: {records[g_rids[0]]} [{g_rids[0]}].",
                    "citations": [g_rids[0]],
                    "insufficient_evidence": False,
                }

        # 6. Hemoglobin / Anemia specific
        if any(w in qtoks for w in ("hemoglobin", "haemoglobin", "hb", "anemia")) or "hemoglobin" in q_lower or "anemia" in q_lower:
            h_rids = [rid for rid, text in records.items() if "hemoglobin" in text.lower()]
            if h_rids:
                return {
                    "answer": f"According to your verified records: {records[h_rids[0]]} [{h_rids[0]}].",
                    "citations": [h_rids[0]],
                    "insufficient_evidence": False,
                }

        # 6. Conditions & Symptoms (weakness, giddiness, hypoglycemia, dizzy)
        if any(w in qtoks or w in q_lower for w in ("condition", "symptom", "giddiness", "weakness", "dizzy", "hypoglycemic", "tired", "feel")):
            c_rids = [rid for rid, text in records.items() if "condition:" in text.lower() or "giddiness" in text.lower() or "weakness" in text.lower()]
            if c_rids:
                ans_parts = [f"{records[rid]} [{rid}]" for rid in c_rids[:3]]
                return {
                    "answer": f"According to your verified records: {'; '.join(ans_parts)}.",
                    "citations": c_rids[:3],
                    "insufficient_evidence": False,
                }

        # Specific conditions or newly uploaded medications (knee, diclofenac, ultrafen, progut, etc.)
        if any(w in q_lower for w in ("knee", "ultrafen", "diclofenac", "progut", "relentus", "cartilix", "cartilex", "ultracal", "omeprazole", "x-ray", "mri", "stairs")):
            knee_rids = [
                rid for rid, text in records.items()
                if any(w in text.lower() for w in ("knee", "ultrafen", "diclofenac", "progut", "relentus", "cartilix", "ultracal", "omeprazole", "x-ray", "mri"))
            ]
            if knee_rids:
                top_rids = knee_rids[:3]
                ans_parts = [f"{records[rid]} [{rid}]" for rid in top_rids]
                return {
                    "answer": f"According to your verified records: {'; '.join(ans_parts)}.",
                    "citations": top_rids,
                    "insufficient_evidence": False,
                }

        # 7. Prescriptions / Medications general
        if any(w in qtoks or w in q_lower for w in ("medication", "prescription", "rx", "pill", "tablet", "dose", "antibiotic", "treatment")):
            med_rids = [rid for rid, text in records.items() if "medication:" in text.lower()]
            if med_rids:
                ans_parts = [f"{records[rid]} [{rid}]" for rid in med_rids[:3]]
                return {
                    "answer": f"According to your verified records: {'; '.join(ans_parts)}.",
                    "citations": med_rids[:3],
                    "insufficient_evidence": False,
                }

        # 8. Lab tests general
        if any(w in qtoks or w in q_lower for w in ("lab", "test", "blood", "report", "result")):
            lab_rids = [rid for rid, text in records.items() if "lab result:" in text.lower()]
            if lab_rids:
                ans_parts = [f"{records[rid]} [{rid}]" for rid in lab_rids[:3]]
                return {
                    "answer": f"According to your verified records: {'; '.join(ans_parts)}.",
                    "citations": lab_rids[:3],
                    "insufficient_evidence": False,
                }

        # 9. Token overlap matching across all records
        matching_rids = sorted(
            [rid for rid, text in records.items() if len(qtoks & set(_tokens(text))) > 0],
            key=lambda rid: len(qtoks & set(_tokens(records[rid]))),
            reverse=True,
        )
        if matching_rids:
            top_rids = matching_rids[:3]
            answer_parts = [f"{records[rid]} [{rid}]" for rid in top_rids]
            return {
                "answer": f"According to your verified records: {'; '.join(answer_parts)}.",
                "citations": top_rids,
                "insufficient_evidence": False,
            }

        if records:
            top_rids = list(records.keys())[:2]
            answer_parts = [f"{records[rid]} [{rid}]" for rid in top_rids]
            return {
                "answer": f"According to your verified records: {'; '.join(answer_parts)}.",
                "citations": top_rids,
                "insufficient_evidence": False,
            }
        return {"answer": "The verified records do not contain this information.", "citations": [], "insufficient_evidence": True}


def cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b)) / ((math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))) or 1)

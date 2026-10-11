"""Test fixtures that build real PDF / WAV bytes in-memory (no binary files checked in)."""
from __future__ import annotations

import io
import wave


def make_pdf(lines: list[str]) -> bytes:
    """Minimal valid single-page PDF with one text line per entry (Helvetica)."""
    def esc(s: str) -> str:
        return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    ops = ["BT", "/F1 11 Tf", "14 TL", "50 780 Td"]
    for ln in lines:
        ops.append(f"({esc(ln)}) Tj T*")
    ops.append("ET")
    stream = "\n".join(ops).encode("latin-1")
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    ]
    out = io.BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets = []
    for i, o in enumerate(objs, start=1):
        offsets.append(out.tell())
        out.write(b"%d 0 obj\n" % i + o + b"\nendobj\n")
    xref = out.tell()
    out.write(b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1))
    for off in offsets:
        out.write(b"%010d 00000 n \n" % off)
    out.write(b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref))
    return out.getvalue()


def make_wav(seconds: float = 0.3, rate: int = 16000, question: str | None = None, lang: str = "en-IN") -> bytes:
    """16 kHz mono WAV. `question` appends a marker the offline fake STT reads back."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b"\x00\x00" * int(seconds * rate))
    data = buf.getvalue()
    if question:
        data += f"#Q:{lang}|{question}\n".encode()
    return data


LAB_REPORT_1 = [
    "City Diagnostics - Complete Blood Count & Biochemistry",
    "Patient: Asha Rao   Age: 52   Sex: F",
    "Report Date: 14/03/2026",
    "Hemoglobin: 10.2 g/dL (12.0-15.5) L",
    "HbA1c: 7.8 % (4.0-5.6) H",
    "Fasting Blood Sugar: 142 mg/dL (70-100) H",
    "Serum Creatinine: 0.9 mg/dL (0.6-1.1)",
    "LDL Cholesterol: 162 mg/dL (0-100) H",
    "BP: 138/88 mmHg",
    "Diagnosis: Type 2 diabetes mellitus; Iron deficiency anaemia",
    "Rx: Metformin 500 mg BD",
    "Rx: Ferrous sulfate 200 mg OD",
    "Allergies: Penicillin",
]

LAB_REPORT_2 = [
    "City Diagnostics - Follow-up",
    "Report Date: 20/08/2026",
    "Hemoglobin: 12.4 g/dL (12.0-15.5)",
    "HbA1c: 6.9 % (4.0-5.6) H",
    "Platelet count: 2.5 lakh/cumm (1.5-4.5)",
    "Mystery Marker X: 42 units",
]

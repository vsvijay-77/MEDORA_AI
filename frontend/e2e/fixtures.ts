/** Builds the same tiny PDFs / WAVs as the backend test helpers, so E2E needs no binary fixtures. */
export function makePdf(lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const ops = ["BT", "/F1 11 Tf", "14 TL", "50 780 Td", ...lines.map((l) => `(${esc(l)}) Tj T*`), "ET"].join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(ops, "latin1")} >>\nstream\n${ops}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(Buffer.byteLength(out, "latin1")); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

export function makeWav(question?: string, lang = "en-IN"): Buffer {
  const rate = 16000, samples = rate / 4;
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + samples * 2, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(samples * 2, 40);
  const parts = [h, Buffer.alloc(samples * 2)];
  if (question) parts.push(Buffer.from(`#Q:${lang}|${question}\n`, "utf8")); // read back by the offline fake STT
  return Buffer.concat(parts);
}

export const REPORT_1 = [
  "City Diagnostics - Complete Blood Count & Biochemistry",
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
];

export const REPORT_2 = ["Report Date: 20/08/2026", "Hemoglobin: 12.4 g/dL (12.0-15.5)", "Mystery Marker X: 42 units"];

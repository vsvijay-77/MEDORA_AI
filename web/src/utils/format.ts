import type { ClinicalRecord, DocItem, DocStatus, LangCode } from "@/types";

export const LANGUAGES: { code: LangCode; label: string; native: string }[] = [
  { code: "en-IN", label: "English", native: "English" },
  { code: "ta-IN", label: "Tamil", native: "தமிழ்" },
  { code: "hi-IN", label: "Hindi", native: "हिन्दी" },
];
export const langLabel = (c: string) => LANGUAGES.find((l) => l.code === c)?.label ?? c;

export const DISCLAIMER =
  "MedChronicle helps organize and explain your medical records. It does not provide medical diagnosis or replace professional medical advice.";

export function formatDate(iso?: string | null, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }): string {
  if (!iso) return "Date unknown";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? "Date unknown" : d.toLocaleDateString("en-GB", opts);
}

export function relativeDay(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDate(iso);
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function valueOf(r: ClinicalRecord): string {
  if (r.kind === "medication") return [r.dose, r.frequency].filter(Boolean).join(" · ") || "—";
  if (r.value_text) return `${r.value_text}${r.unit ? ` ${r.unit}` : ""}`;
  if (r.value_num !== null && r.value_num !== undefined) return `${Number(r.value_num.toFixed(3))}${r.unit ? ` ${r.unit}` : ""}`;
  return "—";
}

export function rangeOf(r: ClinicalRecord): string {
  if (r.ref_low !== null && r.ref_high !== null) return `${r.ref_low}–${r.ref_high}`;
  if (r.ref_high !== null) return `< ${r.ref_high}`;
  if (r.ref_low !== null) return `> ${r.ref_low}`;
  return "—";
}

/* ---- confidence -------------------------------------------------------------------- */
export type ConfidenceBand = "verified" | "review" | "confirm";
export function confidenceBand(c: number | null | undefined): ConfidenceBand {
  const pct = (c ?? 0) * 100;
  return pct >= 90 ? "verified" : pct >= 75 ? "review" : "confirm";
}
export const BAND_LABEL: Record<ConfidenceBand, string> = {
  verified: "Verified", review: "Review Recommended", confirm: "Confirmation Required",
};

/* ---- record / document classification --------------------------------------------- */
export type DocKind = "Prescription" | "Lab Report" | "Discharge Summary" | "Diagnostic Report" | "Medical Document";

export function inferDocKind(records: ClinicalRecord[], hint?: string): DocKind {
  if (hint && hint !== "auto") {
    return ({ prescription: "Prescription", lab: "Lab Report", discharge: "Discharge Summary", diagnostic: "Diagnostic Report" } as Record<string, DocKind>)[hint] ?? "Medical Document";
  }
  const n = (k: string) => records.filter((r) => r.kind === k).length;
  if (n("medication") > 0 && n("medication") >= n("lab_result")) return "Prescription";
  if (n("lab_result") + n("vital") > 0) return "Lab Report";
  if (n("condition") + n("procedure") > 0) return "Discharge Summary";
  return "Medical Document";
}

export type DisplayStatus = "Verified" | "Review" | "Needs Confirmation" | "Processing" | "Failed" | "Rejected";

export function recordDisplayStatus(r: ClinicalRecord): DisplayStatus {
  if (r.status === "rejected") return "Rejected";
  if (r.status === "verified") return "Verified";
  return (r.confidence ?? 0) >= 0.75 ? "Review" : "Needs Confirmation";
}

export const PENDING_STATUSES: DocStatus[] = ["uploaded", "digitising", "extracting"];

export interface DocView {
  doc: DocItem; records: ClinicalRecord[]; kind: DocKind; date: string; status: DisplayStatus; confidence: number | null;
}

export function buildDocViews(docs: DocItem[], records: ClinicalRecord[], hints: Record<string, string> = {}): DocView[] {
  return docs.map((doc) => {
    const recs = records.filter((r) => r.document_id === doc.id);
    const dates = recs.map((r) => r.effective_date).filter(Boolean) as string[];
    const confs = recs.map((r) => r.confidence).filter((c): c is number => c !== null);
    let status: DisplayStatus;
    if (doc.status === "failed") status = "Failed";
    else if (PENDING_STATUSES.includes(doc.status)) status = "Processing";
    else if (recs.some((r) => r.status === "needs_review")) status = recs.some((r) => r.status === "needs_review" && (r.confidence ?? 0) < 0.75) ? "Needs Confirmation" : "Review";
    else status = "Verified";
    return {
      doc, records: recs, kind: inferDocKind(recs, hints[doc.id]),
      date: dates.sort().at(-1) ?? doc.created_at,
      status, confidence: confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null,
    };
  });
}

/* ---- medication helpers ------------------------------------------------------------ */
export interface Schedule { morning: boolean; afternoon: boolean; night: boolean; known: boolean }
export function parseSchedule(freq?: string | null): Schedule {
  const f = (freq ?? "").toLowerCase();
  const m = f.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (m) return { morning: +m[1] > 0, afternoon: +m[2] > 0, night: +m[3] > 0, known: true };
  if (/(thrice|three times|\btds\b|\btid\b)/.test(f)) return { morning: true, afternoon: true, night: true, known: true };
  if (/(twice|two times|\bbd\b|\bbid\b)/.test(f)) return { morning: true, afternoon: false, night: true, known: true };
  if (/(once|\bod\b|daily|every day)/.test(f)) return { morning: true, afternoon: false, night: false, known: true };
  if (/(night|bedtime|\bhs\b)/.test(f)) return { morning: false, afternoon: false, night: true, known: true };
  return { morning: false, afternoon: false, night: false, known: false };
}
export function parseInstruction(...texts: (string | null | undefined)[]): string | null {
  const t = texts.filter(Boolean).join(" ").toLowerCase();
  if (/(after (food|meals?)|\baf\b|\bpc\b)/.test(t)) return "After food";
  if (/(before (food|meals?)|\bbf\b|\bac\b|empty stomach)/.test(t)) return "Before food";
  return null;
}
export function parseDuration(...texts: (string | null | undefined)[]): string | null {
  const m = texts.filter(Boolean).join(" ").match(/(\d+)\s*(day|days|week|weeks|month|months)\b/i);
  return m ? `${m[1]} ${m[2].toLowerCase()}` : null;
}
export const stripCitations = (s: string) => s.replace(/\s*\[R\d+\]/g, "").trim();

/* ---- best-effort header detection from OCR text ------------------------------------ */
export function detectDoctor(text?: string | null): string | null {
  const m = (text ?? "").match(/\bDr\.?\s+[A-Z][A-Za-z.]+(?:\s+[A-Z][A-Za-z.]+){0,2}/);
  return m ? m[0].replace(/\s+/g, " ").trim() : null;
}
export function detectFacility(text?: string | null): string | null {
  const m = (text ?? "").match(/([A-Z][A-Za-z&.']+(?:\s+[A-Z][A-Za-z&.']+){0,4}\s+(?:Hospital|Clinic|Diagnostics|Laboratory|Labs|Medical Centre|Medical Center))/);
  return m ? m[1] : null;
}
export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

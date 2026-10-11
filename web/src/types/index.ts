export type RecordKind = "lab_result" | "vital" | "medication" | "condition" | "allergy" | "procedure";
export type RecordStatus = "verified" | "needs_review" | "rejected";
export type DocStatus = "uploaded" | "digitising" | "extracting" | "validated" | "failed";

export interface Issue { level: string; code: string; message: string }

export interface ClinicalRecord {
  id: string; patient_id: string; document_id: string | null; kind: RecordKind; name: string; code: string | null;
  value_num: number | null; value_text: string | null; unit: string | null; ref_low: number | null; ref_high: number | null;
  flag: "low" | "normal" | "high" | null; effective_date: string | null; dose: string | null; frequency: string | null;
  confidence: number | null; source_text: string | null; status: RecordStatus; issues: Issue[]; indexed: boolean;
}

export interface DocItem {
  id: string; patient_id: string; filename: string; mime_type: string; size_bytes: number; status: DocStatus;
  error: string | null; created_at: string; text?: string | null;
}

export interface Patient { id: string; name: string; birth_date: string | null; sex: string | null }
export interface Citation { label: string; record_id: string; text: string; score: number | null; document_id: string | null }
export interface Answer {
  answer: string; grounded: boolean; insufficient_evidence: boolean; language: string;
  citations: Citation[]; guard_notes: string[]; disclaimer: string;
}
export interface DocSummary { document_id: string; filename: string; language: string; summary: string; audio_supported: boolean; notice: string }
export interface SearchHit { score: number; text: string; record: ClinicalRecord }
export interface TimelineDay { date: string; records: ClinicalRecord[] }
export interface FhirResource { resourceType: string; id?: string; [k: string]: unknown }
export interface FhirBundle { resourceType: "Bundle"; type: string; timestamp?: string; entry: { fullUrl?: string; resource: FhirResource }[] }

export type LangCode = "en-IN" | "ta-IN" | "hi-IN";
export type Gender = "female" | "male" | "other" | "prefer_not_to_say";

export interface UserProfile {
  id: string; name: string; email: string; dob?: string; gender?: Gender; language: LangCode; abha?: string;
  onboarded: boolean; createdAt: string;
}

export interface ChatMessage {
  id: string; role: "user" | "assistant"; text: string; citations?: Citation[]; confidence?: number | null;
  language?: LangCode; insufficient?: boolean; error?: boolean;
}

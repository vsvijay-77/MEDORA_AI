import { api } from "./client";
import type { ClinicalRecord, DocItem, DocSummary, FhirBundle, LangCode } from "@/types";

export const listDocuments = async (pid: string) => (await api.get<DocItem[]>(`/api/patients/${pid}/documents`)).data;
export const getDocument = async (id: string) => (await api.get<DocItem>(`/api/documents/${id}`)).data;
export const listRecords = async (pid: string) => (await api.get<ClinicalRecord[]>(`/api/patients/${pid}/records`)).data;

export async function uploadDocument(pid: string, file: File, onProgress?: (pct: number) => void) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post<DocItem>(`/api/patients/${pid}/documents`, fd, {
    onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
  });
  return data;
}

export const reviewRecord = async (id: string, action: "approve" | "reject", corrections: Record<string, unknown> = {}) =>
  (await api.post<ClinicalRecord>(`/api/records/${id}/review`, { action, corrections })).data;

export const getDocumentSummary = async (id: string, language: LangCode) =>
  (await api.get<DocSummary>(`/api/documents/${id}/summary`, { params: { language } })).data;

export const deleteDocument = async (id: string) => { await api.delete(`/api/documents/${id}`); };

export const getFhir = async (pid: string) => (await api.get<FhirBundle>(`/api/patients/${pid}/fhir`)).data;

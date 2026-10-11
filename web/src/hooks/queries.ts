import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { askCopilot, getHealthSummary } from "@/api/copilot";
import { deleteWorkspaceData, getWorkspace } from "@/api/patients";
import {
  getDocument, getDocumentSummary, getFhir, listDocuments, listRecords, reviewRecord, uploadDocument,
} from "@/api/records";
import { searchRecords } from "@/api/search";
import { getTimeline } from "@/api/timeline";
import { synthesize, transcribe } from "@/api/voice";
import { PENDING_STATUSES } from "@/utils/format";
import type { LangCode } from "@/types";

export const useWorkspace = () => useQuery({ queryKey: ["workspace"], queryFn: getWorkspace, staleTime: Infinity, retry: 2 });
const usePid = () => useWorkspace().data?.id;

export function useDocuments() {
  const pid = usePid();
  return useQuery({
    queryKey: ["documents", pid], queryFn: () => listDocuments(pid!), enabled: !!pid,
    refetchInterval: (q) => (q.state.data?.some((d) => PENDING_STATUSES.includes(d.status)) ? 1500 : false),
  });
}

/** True while any upload is still being processed (drives faster refetching of dependent data). */
function usePending(): number | false {
  const { data } = useDocuments();
  return data?.some((d) => PENDING_STATUSES.includes(d.status)) ? 2000 : false;
}

export function useRecords() {
  const pid = usePid();
  const refetchInterval = usePending();
  return useQuery({ queryKey: ["records", pid], queryFn: () => listRecords(pid!), enabled: !!pid, refetchInterval });
}

export function useTimeline() {
  const pid = usePid();
  const refetchInterval = usePending();
  return useQuery({ queryKey: ["timeline", pid], queryFn: () => getTimeline(pid!), enabled: !!pid, refetchInterval });
}

export const useDocument = (id?: string) => useQuery({ queryKey: ["document", id], queryFn: () => getDocument(id!), enabled: !!id });

export function useFhir() {
  const pid = usePid();
  return useQuery({ queryKey: ["fhir", pid], queryFn: () => getFhir(pid!), enabled: !!pid });
}

export function useSearch(q: string) {
  const pid = usePid();
  return useQuery({ queryKey: ["search", pid, q], queryFn: () => searchRecords(pid!, q), enabled: !!pid && q.trim().length > 1 });
}

export function useHealthSummary(language: LangCode, enabled: boolean) {
  const pid = usePid();
  return useQuery({ queryKey: ["summary", pid, language], queryFn: () => getHealthSummary(pid!, language), enabled: !!pid && enabled, staleTime: 5 * 60_000 });
}

export function useDocSummary(id: string | undefined, language: LangCode, enabled: boolean) {
  return useQuery({ queryKey: ["docSummary", id, language], queryFn: () => getDocumentSummary(id!, language), enabled: !!id && enabled, staleTime: 10 * 60_000, retry: 1 });
}

/* ---- mutations ----------------------------------------------------------------------- */
export function useUpload(onProgress?: (pct: number) => void) {
  const pid = usePid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadDocument(pid!, file, onProgress),
    onSuccess: () => ["documents", "records", "timeline", "fhir", "summary"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export function useReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; action: "approve" | "reject"; corrections?: Record<string, unknown> }) =>
      reviewRecord(v.id, v.action, v.corrections),
    onSuccess: () => ["records", "timeline", "fhir", "summary"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export function useAsk() {
  const pid = usePid();
  return useMutation({ mutationFn: (v: { question: string; language: LangCode }) => askCopilot(pid!, v.question, v.language) });
}

export const useTranscribe = () => useMutation({ mutationFn: (v: { blob: Blob; language?: LangCode | "unknown" }) => transcribe(v.blob, v.language) });
export const useTts = () => useMutation({ mutationFn: (v: { text: string; language: LangCode }) => synthesize(v.text, v.language) });

export function useDeleteAll() {
  const pid = usePid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteWorkspaceData(pid!),
    onSuccess: () => qc.clear(),
  });
}

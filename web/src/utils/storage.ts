/** Small typed localStorage helpers (safe when storage is unavailable). */
export function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
export function save<T>(key: string, value: T) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ } }

export const DOC_HINTS_KEY = "mc_doc_hints";
export const getDocHints = () => load<Record<string, string>>(DOC_HINTS_KEY, {});
export const setDocHint = (docId: string, hint: string) => save(DOC_HINTS_KEY, { ...getDocHints(), [docId]: hint });

export interface Prefs { voiceAutoplay: boolean; notifyProcessed: boolean; notifyReview: boolean; notifySummary: boolean; compactTables: boolean }
export const PREFS_KEY = "mc_prefs";
export const DEFAULT_PREFS: Prefs = { voiceAutoplay: false, notifyProcessed: true, notifyReview: true, notifySummary: true, compactTables: false };

import axios, { AxiosError } from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "";

export const api = axios.create({ baseURL, timeout: 120_000 });

// Only attach a bearer token when a real backend API key is configured. (The demo sign-in below is a
// local, browser-only session and must never be sent to the backend as a credential.)
api.interceptors.request.use((config) => {
  const key = import.meta.env.VITE_API_KEY || (typeof localStorage !== "undefined" ? localStorage.getItem("mc_api_key") : null);
  if (key) config.headers.set("Authorization", `Bearer ${key}`);
  return config;
});

/** Turn any thrown value into a calm, user-presentable message (never leaks raw HTML / stack traces). */
export function apiError(e: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(e)) {
    const err = e as AxiosError<{ detail?: unknown }>;
    if (!err.response) return "We couldn't reach the MedChronicle service. Check that the backend is running and try again.";
    const d = err.response.data?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map((x) => (x && typeof x === "object" && "msg" in x ? String((x as { msg: unknown }).msg) : String(x))).join("; ");
    if (d && typeof d === "object" && "message" in d) return String((d as { message: unknown }).message);
    if (err.response.status === 502 || err.response.status === 503) return "AI service is temporarily unavailable.";
    if (err.response.status >= 500) return "The server hit a problem. Please try again in a moment.";
  }
  return e instanceof Error && e.message ? e.message : fallback;
}

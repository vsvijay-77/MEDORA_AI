import { api } from "./client";
import type { LangCode } from "@/types";

export async function transcribe(blob: Blob, language: LangCode | "unknown" = "unknown") {
  const fd = new FormData();
  fd.append("audio", blob, blob.type.includes("mp4") ? "speech.m4a" : "speech.webm");
  fd.append("language", language);
  const { data } = await api.post<{ transcript: string; language_code: string | null }>("/api/voice/transcribe", fd);
  return data;
}

export async function synthesize(text: string, language: LangCode): Promise<Blob> {
  const { data } = await api.post<Blob>("/api/voice/tts", { text: text.slice(0, 5000), language }, { responseType: "blob" });
  return data;
}

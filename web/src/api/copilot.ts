import { api } from "./client";
import type { Answer, LangCode } from "@/types";

export const askCopilot = async (pid: string, question: string, language: LangCode) =>
  (await api.post<Answer>(`/api/patients/${pid}/ask`, { question, language })).data;

export const getHealthSummary = async (pid: string, language: LangCode) =>
  (await api.get<Answer>(`/api/patients/${pid}/summary`, { params: { language } })).data;

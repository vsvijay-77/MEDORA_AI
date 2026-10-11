import { api } from "./client";
import type { SearchHit } from "@/types";

export const searchRecords = async (pid: string, q: string) =>
  (await api.get<SearchHit[]>(`/api/patients/${pid}/search`, { params: { q, limit: 12 } })).data;

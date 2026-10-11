import { api } from "./client";
import type { TimelineDay } from "@/types";

export const getTimeline = async (pid: string) => (await api.get<TimelineDay[]>(`/api/patients/${pid}/timeline`)).data;

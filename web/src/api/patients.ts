import { api } from "./client";
import type { Patient } from "@/types";

/** The single default record set every upload belongs to (the backend creates it on first call). */
export const getWorkspace = async () => (await api.get<Patient>("/api/workspace")).data;

export const deleteWorkspaceData = async (patientId: string) => { await api.delete(`/api/patients/${patientId}`); };

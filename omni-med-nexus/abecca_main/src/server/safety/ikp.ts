/**
 * IKP (Insiden Keselamatan Pasien) reports — hospital-wide patient-safety
 * incident register (KARS). Tenant-scoped; env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";

export type IncidentType = "KPC" | "KNC" | "KTC" | "KTD" | "sentinel";
export type Grading = "biru" | "hijau" | "kuning" | "merah";
export type IkpStatus = "reported" | "investigating" | "closed";

export interface IkpReport {
  id: string;
  companyId: string;
  incidentType: IncidentType;
  title: string;
  description: string | null;
  location: string | null;
  patientId: string | null;
  incidentDate: string | null;
  grading: Grading | null;
  status: IkpStatus;
  reportedBy: string | null;
  createdAt: string;
}

const g = globalThis as unknown as { __abeccaIkp?: IkpReport[] };
const mem = g.__abeccaIkp ?? (g.__abeccaIkp = []);

type Row = {
  id: string; company_id: string; incident_type: IncidentType; title: string;
  description: string | null; location: string | null; patient_id: string | null;
  incident_date: string | null; grading: Grading | null; status: IkpStatus;
  reported_by: string | null; created_at: string;
};
const toReport = (r: Row): IkpReport => ({
  id: r.id, companyId: r.company_id, incidentType: r.incident_type, title: r.title,
  description: r.description, location: r.location, patientId: r.patient_id,
  incidentDate: r.incident_date, grading: r.grading, status: r.status,
  reportedBy: r.reported_by, createdAt: r.created_at,
});

export const INCIDENT_TYPES: IncidentType[] = ["KPC", "KNC", "KTC", "KTD", "sentinel"];
export const GRADINGS: Grading[] = ["biru", "hijau", "kuning", "merah"];
export const IKP_STATUSES: IkpStatus[] = ["reported", "investigating", "closed"];
export const isIncidentType = (v: unknown): v is IncidentType =>
  typeof v === "string" && INCIDENT_TYPES.includes(v as IncidentType);
export const isGrading = (v: unknown): v is Grading =>
  typeof v === "string" && GRADINGS.includes(v as Grading);
export const isIkpStatus = (v: unknown): v is IkpStatus =>
  typeof v === "string" && IKP_STATUSES.includes(v as IkpStatus);

export interface CreateIkpInput {
  incidentType: IncidentType;
  title: string;
  description?: string | null;
  location?: string | null;
  patientId?: string | null;
  incidentDate?: string | null;
  reportedBy?: string | null;
}

export async function createReport(companyId: string, input: CreateIkpInput): Promise<IkpReport> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("ikp_reports")
      .insert({
        company_id: companyId, incident_type: input.incidentType, title: input.title,
        description: input.description ?? null, location: input.location ?? null,
        patient_id: input.patientId ?? null, incident_date: input.incidentDate ?? null,
        status: "reported", reported_by: input.reportedBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create IKP failed");
    return toReport(data as Row);
  }
  const rep: IkpReport = {
    id: crypto.randomUUID(), companyId, incidentType: input.incidentType, title: input.title,
    description: input.description ?? null, location: input.location ?? null,
    patientId: input.patientId ?? null, incidentDate: input.incidentDate ?? null,
    grading: null, status: "reported", reportedBy: input.reportedBy ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(rep);
  return rep;
}

export async function listReports(companyId: string): Promise<IkpReport[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("ikp_reports").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    return (data ?? []).map((r) => toReport(r as Row));
  }
  return mem
    .filter((r) => r.companyId === companyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateReport(
  companyId: string,
  id: string,
  patch: { grading?: Grading; status?: IkpStatus },
): Promise<IkpReport | undefined> {
  const fields: Record<string, unknown> = {};
  if (patch.grading) fields.grading = patch.grading;
  if (patch.status) fields.status = patch.status;
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("ikp_reports").update(fields).eq("company_id", companyId).eq("id", id).select("*").maybeSingle();
    return data ? toReport(data as Row) : undefined;
  }
  const rep = mem.find((r) => r.companyId === companyId && r.id === id);
  if (!rep) return undefined;
  if (patch.grading) rep.grading = patch.grading;
  if (patch.status) rep.status = patch.status;
  return rep;
}

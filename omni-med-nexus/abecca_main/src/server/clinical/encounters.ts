/**
 * Encounters & structured (ICD-10) diagnoses — the clinical backbone that ties
 * orders, billing, claims and statistics to a single visit. Tenant-scoped by
 * company_id. Env-gated like the rest of the BFF (Supabase when configured,
 * else in-memory singleton for preview/dev).
 */
import { getSupabase } from "../supabase";

export type EncounterType = "outpatient" | "inpatient" | "ed" | "odc";
export type EncounterStatus = "planned" | "in_progress" | "finished" | "cancelled";
export type DiagnosisRank = "primary" | "secondary";

export interface Encounter {
  id: string;
  companyId: string;
  patientId: string;
  type: EncounterType;
  status: EncounterStatus;
  ward: string | null;
  bed: string | null;
  dpjpUserId: string | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

export interface Diagnosis {
  id: string;
  companyId: string;
  encounterId: string;
  patientId: string;
  code: string;
  description: string;
  rank: DiagnosisRank;
  createdBy: string | null;
  createdAt: string;
}

export interface CreateEncounterInput {
  patientId: string;
  type: EncounterType;
  ward?: string | null;
  bed?: string | null;
  dpjpUserId?: string | null;
}

export interface AddDiagnosisInput {
  code: string;
  description: string;
  rank?: DiagnosisRank;
  createdBy?: string | null;
}

const TERMINAL: EncounterStatus[] = ["finished", "cancelled"];

/* ----------------------------- in-memory ----------------------------- */

const g = globalThis as unknown as {
  __abeccaEncounters?: { encounters: Encounter[]; diagnoses: Diagnosis[] };
};
const mem = g.__abeccaEncounters ?? (g.__abeccaEncounters = { encounters: [], diagnoses: [] });

/* ----------------------------- supabase mappers ----------------------------- */

type EncounterRow = {
  id: string; company_id: string; patient_id: string; type: EncounterType;
  status: EncounterStatus; ward: string | null; bed: string | null;
  dpjp_user_id: string | null; started_at: string; ended_at: string | null; created_at: string;
};
type DiagnosisRow = {
  id: string; company_id: string; encounter_id: string; patient_id: string;
  code: string; description: string; rank: DiagnosisRank; created_by: string | null; created_at: string;
};
const toEncounter = (r: EncounterRow): Encounter => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, type: r.type, status: r.status,
  ward: r.ward, bed: r.bed, dpjpUserId: r.dpjp_user_id, startedAt: r.started_at,
  endedAt: r.ended_at, createdAt: r.created_at,
});
const toDiagnosis = (r: DiagnosisRow): Diagnosis => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  code: r.code, description: r.description, rank: r.rank, createdBy: r.created_by, createdAt: r.created_at,
});

/* ----------------------------- public API ----------------------------- */

export async function createEncounter(
  companyId: string,
  input: CreateEncounterInput,
): Promise<Encounter> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("encounters")
      .insert({
        company_id: companyId,
        patient_id: input.patientId,
        type: input.type,
        status: "in_progress",
        ward: input.ward ?? null,
        bed: input.bed ?? null,
        dpjp_user_id: input.dpjpUserId ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create encounter failed");
    return toEncounter(data as EncounterRow);
  }
  const now = new Date().toISOString();
  const e: Encounter = {
    id: crypto.randomUUID(),
    companyId,
    patientId: input.patientId,
    type: input.type,
    status: "in_progress",
    ward: input.ward ?? null,
    bed: input.bed ?? null,
    dpjpUserId: input.dpjpUserId ?? null,
    startedAt: now,
    endedAt: null,
    createdAt: now,
  };
  mem.encounters.push(e);
  return e;
}

export async function listEncounters(companyId: string, patientId: string): Promise<Encounter[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("encounters")
      .select("*")
      .eq("company_id", companyId)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => toEncounter(r as EncounterRow));
  }
  return mem.encounters
    .filter((e) => e.companyId === companyId && e.patientId === patientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getEncounter(companyId: string, id: string): Promise<Encounter | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("encounters").select("*").eq("company_id", companyId).eq("id", id).maybeSingle();
    return data ? toEncounter(data as EncounterRow) : undefined;
  }
  return mem.encounters.find((e) => e.companyId === companyId && e.id === id);
}

export async function setEncounterStatus(
  companyId: string,
  id: string,
  status: EncounterStatus,
): Promise<Encounter | undefined> {
  const endedAt = TERMINAL.includes(status) ? new Date().toISOString() : null;
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("encounters")
      .update({ status, ended_at: endedAt })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toEncounter(data as EncounterRow) : undefined;
  }
  const e = mem.encounters.find((x) => x.companyId === companyId && x.id === id);
  if (!e) return undefined;
  e.status = status;
  e.endedAt = endedAt;
  return e;
}

export async function addDiagnosis(
  companyId: string,
  encounterId: string,
  input: AddDiagnosisInput,
): Promise<Diagnosis | undefined> {
  const encounter = await getEncounter(companyId, encounterId);
  if (!encounter) return undefined;
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("diagnoses")
      .insert({
        company_id: companyId,
        encounter_id: encounterId,
        patient_id: encounter.patientId,
        code: input.code,
        description: input.description,
        rank: input.rank ?? "secondary",
        created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "add diagnosis failed");
    return toDiagnosis(data as DiagnosisRow);
  }
  const d: Diagnosis = {
    id: crypto.randomUUID(),
    companyId,
    encounterId,
    patientId: encounter.patientId,
    code: input.code,
    description: input.description,
    rank: input.rank ?? "secondary",
    createdBy: input.createdBy ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.diagnoses.push(d);
  return d;
}

export async function listDiagnoses(companyId: string, encounterId: string): Promise<Diagnosis[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("diagnoses")
      .select("*")
      .eq("company_id", companyId)
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });
    return (data ?? []).map((r) => toDiagnosis(r as DiagnosisRow));
  }
  return mem.diagnoses
    .filter((d) => d.companyId === companyId && d.encounterId === encounterId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

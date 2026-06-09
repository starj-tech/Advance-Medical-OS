/**
 * Discharge summary (resume medis pulang). One per encounter — the structured
 * closing record KARS/SNARS requires when a visit ends: condition at discharge,
 * a clinical summary, treatment given, follow-up plan and take-home medication.
 * Creating it also closes the encounter. Tenant-scoped; env-gated.
 */
import { getSupabase } from "../supabase";

export type DischargeCondition = "membaik" | "sembuh" | "dirujuk" | "pulang_paksa" | "meninggal";
export const DISCHARGE_CONDITIONS: DischargeCondition[] = [
  "membaik", "sembuh", "dirujuk", "pulang_paksa", "meninggal",
];

export interface DischargeSummary {
  id: string;
  companyId: string;
  encounterId: string;
  patientId: string;
  condition: DischargeCondition;
  clinicalSummary: string;
  treatment: string | null;
  followUp: string | null;
  dischargeMeds: string | null;
  authoredBy: string | null;
  createdAt: string;
}

export interface CreateDischargeInput {
  patientId: string;
  condition: DischargeCondition;
  clinicalSummary: string;
  treatment?: string | null;
  followUp?: string | null;
  dischargeMeds?: string | null;
  authoredBy?: string | null;
}

const g = globalThis as unknown as { __abeccaDischarges?: DischargeSummary[] };
const mem = g.__abeccaDischarges ?? (g.__abeccaDischarges = []);

type Row = {
  id: string; company_id: string; encounter_id: string; patient_id: string;
  condition: DischargeCondition; clinical_summary: string; treatment: string | null;
  follow_up: string | null; discharge_meds: string | null; authored_by: string | null;
  created_at: string;
};
const toSummary = (r: Row): DischargeSummary => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  condition: r.condition, clinicalSummary: r.clinical_summary, treatment: r.treatment,
  followUp: r.follow_up, dischargeMeds: r.discharge_meds, authoredBy: r.authored_by,
  createdAt: r.created_at,
});

export async function getDischargeSummary(
  companyId: string,
  encounterId: string,
): Promise<DischargeSummary | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("discharge_summaries")
      .select("*")
      .eq("company_id", companyId)
      .eq("encounter_id", encounterId)
      .maybeSingle();
    return data ? toSummary(data as Row) : undefined;
  }
  return mem.find((d) => d.companyId === companyId && d.encounterId === encounterId);
}

export async function createDischargeSummary(
  companyId: string,
  encounterId: string,
  input: CreateDischargeInput,
): Promise<DischargeSummary> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("discharge_summaries")
      .insert({
        company_id: companyId,
        encounter_id: encounterId,
        patient_id: input.patientId,
        condition: input.condition,
        clinical_summary: input.clinicalSummary,
        treatment: input.treatment ?? null,
        follow_up: input.followUp ?? null,
        discharge_meds: input.dischargeMeds ?? null,
        authored_by: input.authoredBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create discharge summary failed");
    return toSummary(data as Row);
  }
  const summary: DischargeSummary = {
    id: crypto.randomUUID(),
    companyId,
    encounterId,
    patientId: input.patientId,
    condition: input.condition,
    clinicalSummary: input.clinicalSummary,
    treatment: input.treatment ?? null,
    followUp: input.followUp ?? null,
    dischargeMeds: input.dischargeMeds ?? null,
    authoredBy: input.authoredBy ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(summary);
  return summary;
}

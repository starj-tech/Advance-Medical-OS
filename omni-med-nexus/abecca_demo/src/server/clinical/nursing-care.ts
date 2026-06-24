/**
 * Nursing care plan (asuhan keperawatan). One entry per encounter capturing the
 * nursing process in the Indonesian SDKI/SLKI/SIKI framing: nursing diagnosis,
 * target outcome, intervention and (optional) evaluation. Complements the CPPT
 * from the nursing side. Tenant-scoped by company_id; env-gated.
 */
import { getSupabase } from "../supabase";

export interface NursingCare {
  id: string;
  companyId: string;
  encounterId: string;
  patientId: string;
  nursingDiagnosis: string;
  goal: string;
  intervention: string;
  evaluation: string | null;
  authoredBy: string | null;
  createdAt: string;
}

export interface AddNursingCareInput {
  patientId: string;
  nursingDiagnosis: string;
  goal: string;
  intervention: string;
  evaluation?: string | null;
  authoredBy?: string | null;
}

const g = globalThis as unknown as { __abeccaNursingCare?: NursingCare[] };
const mem = g.__abeccaNursingCare ?? (g.__abeccaNursingCare = []);

type Row = {
  id: string; company_id: string; encounter_id: string; patient_id: string;
  nursing_diagnosis: string; goal: string; intervention: string;
  evaluation: string | null; authored_by: string | null; created_at: string;
};
const toCare = (r: Row): NursingCare => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  nursingDiagnosis: r.nursing_diagnosis, goal: r.goal, intervention: r.intervention,
  evaluation: r.evaluation, authoredBy: r.authored_by, createdAt: r.created_at,
});

export async function addNursingCare(
  companyId: string,
  encounterId: string,
  input: AddNursingCareInput,
): Promise<NursingCare> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("nursing_care")
      .insert({
        company_id: companyId,
        encounter_id: encounterId,
        patient_id: input.patientId,
        nursing_diagnosis: input.nursingDiagnosis,
        goal: input.goal,
        intervention: input.intervention,
        evaluation: input.evaluation ?? null,
        authored_by: input.authoredBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "add nursing care failed");
    return toCare(data as Row);
  }
  const care: NursingCare = {
    id: crypto.randomUUID(),
    companyId,
    encounterId,
    patientId: input.patientId,
    nursingDiagnosis: input.nursingDiagnosis,
    goal: input.goal,
    intervention: input.intervention,
    evaluation: input.evaluation ?? null,
    authoredBy: input.authoredBy ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(care);
  return care;
}

export async function listNursingCare(
  companyId: string,
  encounterId: string,
): Promise<NursingCare[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("nursing_care")
      .select("*")
      .eq("company_id", companyId)
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => toCare(r as Row));
  }
  return mem
    .filter((c) => c.companyId === companyId && c.encounterId === encounterId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

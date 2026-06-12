/**
 * ICU/HCU severity assessments (APACHE II). Tenant-scoped by company_id;
 * env-gated (Supabase or in-memory). The score is computed server-side from
 * the raw physiological inputs via lib/apache so the stored result is
 * authoritative; the inputs are kept alongside for audit/re-grading.
 */
import { getSupabase } from "../supabase";
import { computeApache, type ApacheInputs } from "@/lib/apache";

export interface IcuAssessment {
  id: string;
  companyId: string;
  patientId: string;
  encounterId: string | null;
  inputs: ApacheInputs;
  score: number;
  physiologicPoints: number;
  agePoints: number;
  chronicPoints: number;
  estimatedMortality: number;
  assessedBy: string | null;
  createdAt: string;
}

const g = globalThis as unknown as { __abeccaIcu?: IcuAssessment[] };
const mem = g.__abeccaIcu ?? (g.__abeccaIcu = []);

type Row = {
  id: string; company_id: string; patient_id: string; encounter_id: string | null;
  inputs: ApacheInputs; score: number; physiologic_points: number;
  age_points: number; chronic_points: number; estimated_mortality: number;
  assessed_by: string | null; created_at: string;
};
const toAssessment = (r: Row): IcuAssessment => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, encounterId: r.encounter_id,
  inputs: r.inputs, score: r.score, physiologicPoints: r.physiologic_points,
  agePoints: r.age_points, chronicPoints: r.chronic_points,
  estimatedMortality: Number(r.estimated_mortality), assessedBy: r.assessed_by,
  createdAt: r.created_at,
});

export async function createIcuAssessment(
  companyId: string,
  input: {
    patientId: string;
    encounterId?: string | null;
    inputs: ApacheInputs;
    assessedBy?: string | null;
  },
): Promise<IcuAssessment> {
  const result = computeApache(input.inputs);
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("icu_assessments")
      .insert({
        company_id: companyId,
        patient_id: input.patientId,
        encounter_id: input.encounterId ?? null,
        inputs: input.inputs,
        score: result.score,
        physiologic_points: result.physiologicPoints,
        age_points: result.agePoints,
        chronic_points: result.chronicPoints,
        estimated_mortality: result.estimatedMortality,
        assessed_by: input.assessedBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create icu assessment failed");
    return toAssessment(data as Row);
  }
  const assessment: IcuAssessment = {
    id: crypto.randomUUID(),
    companyId,
    patientId: input.patientId,
    encounterId: input.encounterId ?? null,
    inputs: input.inputs,
    score: result.score,
    physiologicPoints: result.physiologicPoints,
    agePoints: result.agePoints,
    chronicPoints: result.chronicPoints,
    estimatedMortality: result.estimatedMortality,
    assessedBy: input.assessedBy ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(assessment);
  return assessment;
}

/** Company-wide list, newest first (the unit board sorts as it likes). */
export async function listIcuAssessments(companyId: string): Promise<IcuAssessment[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("icu_assessments")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => toAssessment(r as Row));
  }
  return mem
    .filter((a) => a.companyId === companyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

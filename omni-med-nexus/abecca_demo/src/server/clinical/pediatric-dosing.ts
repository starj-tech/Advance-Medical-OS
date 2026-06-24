/**
 * Paediatric dose calculations (Domain B / CDS). Each record is a saved weight-based dose
 * computation for a patient — the per-dose/per-day figures are derived server-side via the pure
 * dosing module, so a stored dose always matches its drug and weight. This doubles as a dosing
 * audit trail. Tenant-scoped by company_id; env-gated.
 */
import { getSupabase } from "../supabase";
import { drugByCode, isValidWeight, doseFor } from "@/lib/pediatric-dosing";

export interface DoseCalculation {
  id: string;
  companyId: string;
  patientId: string;
  patientName: string;
  drugCode: string;
  drugName: string;
  weightKg: number;
  perDose: number;
  perDay: number;
  frequencyPerDay: number;
  capped: boolean;
  computedBy: string | null;
  computedAt: string;
}

type Row = {
  id: string; company_id: string; patient_id: string; patient_name: string; drug_code: string;
  drug_name: string; weight_kg: number; per_dose: number; per_day: number; frequency_per_day: number;
  capped: boolean; computed_by: string | null; computed_at: string;
};
const toCalc = (r: Row): DoseCalculation => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, patientName: r.patient_name,
  drugCode: r.drug_code, drugName: r.drug_name, weightKg: Number(r.weight_kg), perDose: Number(r.per_dose),
  perDay: Number(r.per_day), frequencyPerDay: Number(r.frequency_per_day), capped: r.capped,
  computedBy: r.computed_by, computedAt: r.computed_at,
});

const g = globalThis as unknown as { __abeccaDoseCalcs?: DoseCalculation[] };
const mem = g.__abeccaDoseCalcs ?? (g.__abeccaDoseCalcs = []);

export type RecordResult =
  | { ok: true; calculation: DoseCalculation }
  | { ok: false; reason: "unknown_drug" | "invalid_weight" };

/** Compute and persist a paediatric dose. Rejects unknown drugs and out-of-range weights. */
export async function recordDoseCalc(
  companyId: string,
  input: { patientId: string; patientName: string; drugCode: string; weightKg: number; computedBy?: string | null },
): Promise<RecordResult> {
  const drug = drugByCode(input.drugCode);
  if (!drug) return { ok: false, reason: "unknown_drug" };
  if (!isValidWeight(input.weightKg)) return { ok: false, reason: "invalid_weight" };
  const dose = doseFor(drug, input.weightKg);
  const capped = dose.perDoseCapped || dose.perDayCapped;

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("dose_calculations")
      .insert({
        company_id: companyId, patient_id: input.patientId, patient_name: input.patientName,
        drug_code: drug.code, drug_name: drug.name, weight_kg: input.weightKg,
        per_dose: dose.perDose, per_day: dose.perDay, frequency_per_day: dose.frequencyPerDay,
        capped, computed_by: input.computedBy ?? null,
      })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "record dose failed");
    return { ok: true, calculation: toCalc(data as Row) };
  }
  const calculation: DoseCalculation = {
    id: crypto.randomUUID(), companyId, patientId: input.patientId, patientName: input.patientName,
    drugCode: drug.code, drugName: drug.name, weightKg: input.weightKg,
    perDose: dose.perDose, perDay: dose.perDay, frequencyPerDay: dose.frequencyPerDay,
    capped, computedBy: input.computedBy ?? null, computedAt: new Date().toISOString(),
  };
  mem.push(calculation);
  return { ok: true, calculation };
}

export async function listDoseCalcs(companyId: string, filter: { patientId?: string } = {}): Promise<DoseCalculation[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("dose_calculations").select("*").eq("company_id", companyId);
    if (filter.patientId) q = q.eq("patient_id", filter.patientId);
    const { data } = await q.order("computed_at", { ascending: false });
    return (data ?? []).map((r) => toCalc(r as Row));
  }
  return mem
    .filter((c) => c.companyId === companyId && (!filter.patientId || c.patientId === filter.patientId))
    .sort((a, b) => b.computedAt.localeCompare(a.computedAt));
}

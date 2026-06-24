/**
 * Antimicrobial stewardship (PPRA — KARS) surveillance. Two tenant-scoped stores —
 * a line-list of antibiotic consumption (grams per drug per month) and a monthly
 * patient-days denominator — are combined into DDD-per-100-patient-days per drug and a
 * WHO AWaRe roll-up (lib/antimicrobial). Mirrors the HAI surveillance shape. Env-gated.
 */
import { getSupabase } from "../supabase";
import {
  totalDdd, dddPer100PatientDays, antibioticByCode,
  type AwareClass,
} from "@/lib/antimicrobial";

export interface AmrConsumption {
  id: string;
  companyId: string;
  period: string; // YYYY-MM
  drugCode: string;
  consumedGrams: number;
  createdAt: string;
}
type ConsRow = { id: string; company_id: string; period: string; drug_code: string; consumed_grams: number; created_at: string };
const toCons = (r: ConsRow): AmrConsumption => ({
  id: r.id, companyId: r.company_id, period: r.period, drugCode: r.drug_code,
  consumedGrams: Number(r.consumed_grams), createdAt: r.created_at,
});

interface PatientDays { companyId: string; period: string; patientDays: number }
type DaysRow = { company_id: string; period: string; patient_days: number };

const g = globalThis as unknown as { __abeccaAmrCons?: AmrConsumption[]; __abeccaAmrDays?: PatientDays[] };
const consumption = g.__abeccaAmrCons ?? (g.__abeccaAmrCons = []);
const patientDaysStore = g.__abeccaAmrDays ?? (g.__abeccaAmrDays = []);

export async function recordConsumption(
  companyId: string,
  input: { period: string; drugCode: string; consumedGrams: number },
): Promise<AmrConsumption> {
  const grams = Math.max(0, input.consumedGrams);
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("amr_consumption")
      .insert({ company_id: companyId, period: input.period, drug_code: input.drugCode, consumed_grams: grams })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "record consumption failed");
    return toCons(data as ConsRow);
  }
  const row: AmrConsumption = {
    id: crypto.randomUUID(), companyId, period: input.period, drugCode: input.drugCode,
    consumedGrams: grams, createdAt: new Date().toISOString(),
  };
  consumption.push(row);
  return row;
}

export async function listConsumption(companyId: string, period: string): Promise<AmrConsumption[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("amr_consumption").select("*").eq("company_id", companyId).eq("period", period).order("created_at", { ascending: false });
    return (data ?? []).map((r) => toCons(r as ConsRow));
  }
  return consumption
    .filter((c) => c.companyId === companyId && c.period === period)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Upsert the patient-days denominator for a period (one value per company+period). */
export async function recordPatientDays(companyId: string, input: { period: string; patientDays: number }): Promise<void> {
  const days = Math.max(0, Math.floor(input.patientDays));
  const sb = getSupabase();
  if (sb) {
    await sb.from("amr_patient_days").upsert({ company_id: companyId, period: input.period, patient_days: days }, { onConflict: "company_id,period" });
    return;
  }
  const existing = patientDaysStore.find((d) => d.companyId === companyId && d.period === input.period);
  if (existing) existing.patientDays = days;
  else patientDaysStore.push({ companyId, period: input.period, patientDays: days });
}

async function getPatientDays(companyId: string, period: string): Promise<number> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("amr_patient_days").select("patient_days").eq("company_id", companyId).eq("period", period).maybeSingle();
    return data ? Number((data as DaysRow).patient_days) : 0;
  }
  return patientDaysStore.find((d) => d.companyId === companyId && d.period === period)?.patientDays ?? 0;
}

export interface DrugUsage {
  drugCode: string;
  name: string;
  aware: AwareClass;
  consumedGrams: number;
  ddd: number;
  dddPer100: number | null;
}
export interface AntimicrobialSummary {
  period: string;
  patientDays: number;
  totalDdd: number;
  totalDddPer100: number | null;
  /** Share of total DDD by AWaRe class (percent, integer). */
  awareShare: Record<AwareClass, number>;
  drugs: DrugUsage[];
}

export async function antimicrobialSummary(companyId: string, period: string): Promise<AntimicrobialSummary> {
  const [items, patientDays] = await Promise.all([listConsumption(companyId, period), getPatientDays(companyId, period)]);

  // Aggregate grams per drug across multiple entries in the period.
  const gramsByDrug = new Map<string, number>();
  for (const c of items) gramsByDrug.set(c.drugCode, (gramsByDrug.get(c.drugCode) ?? 0) + c.consumedGrams);

  const dddByAware: Record<AwareClass, number> = { access: 0, watch: 0, reserve: 0 };
  let totalDddSum = 0;
  const drugs: DrugUsage[] = [];
  for (const [drugCode, grams] of gramsByDrug) {
    const ab = antibioticByCode(drugCode);
    if (!ab) continue;
    const ddd = totalDdd(grams, ab.dddStandard);
    totalDddSum += ddd;
    dddByAware[ab.aware] += ddd;
    drugs.push({ drugCode, name: ab.name, aware: ab.aware, consumedGrams: grams, ddd, dddPer100: dddPer100PatientDays(ddd, patientDays) });
  }
  drugs.sort((a, b) => b.ddd - a.ddd);

  const awareShare: Record<AwareClass, number> = { access: 0, watch: 0, reserve: 0 };
  if (totalDddSum > 0) {
    for (const k of ["access", "watch", "reserve"] as AwareClass[]) {
      awareShare[k] = Math.round((dddByAware[k] / totalDddSum) * 100);
    }
  }

  return {
    period, patientDays, totalDdd: totalDddSum,
    totalDddPer100: dddPer100PatientDays(totalDddSum, patientDays),
    awareShare, drugs,
  };
}

/**
 * Infection-control (PPI) surveillance. Two tenant-scoped stores: a line-list of
 * HAI cases and the monthly device-day denominators; the summary combines them
 * into incidence densities per 1000 device-days (lib/hai). Env-gated (Supabase or
 * in-memory). Periods are "YYYY-MM"; case onset dates are "YYYY-MM-DD".
 */
import { getSupabase } from "../supabase";
import { incidenceRate, type HaiType } from "@/lib/hai";

export interface HaiCase {
  id: string;
  companyId: string;
  patientId: string;
  haiType: HaiType;
  unit: string;
  onsetDate: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface HaiDenominator {
  id: string;
  companyId: string;
  period: string;
  haiType: HaiType;
  unit: string;
  deviceDays: number;
  createdBy: string | null;
  createdAt: string;
}

type CaseRow = {
  id: string; company_id: string; patient_id: string; hai_type: HaiType; unit: string;
  onset_date: string; note: string | null; created_by: string | null; created_at: string;
};
type DenomRow = {
  id: string; company_id: string; period: string; hai_type: HaiType; unit: string;
  device_days: number; created_by: string | null; created_at: string;
};
const toCase = (r: CaseRow): HaiCase => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, haiType: r.hai_type, unit: r.unit,
  onsetDate: r.onset_date, note: r.note, createdBy: r.created_by, createdAt: r.created_at,
});
const toDenom = (r: DenomRow): HaiDenominator => ({
  id: r.id, companyId: r.company_id, period: r.period, haiType: r.hai_type, unit: r.unit,
  deviceDays: Number(r.device_days), createdBy: r.created_by, createdAt: r.created_at,
});

const g = globalThis as unknown as { __abeccaHaiCases?: HaiCase[]; __abeccaHaiDenoms?: HaiDenominator[] };
const cases = g.__abeccaHaiCases ?? (g.__abeccaHaiCases = []);
const denoms = g.__abeccaHaiDenoms ?? (g.__abeccaHaiDenoms = []);

export async function recordCase(
  companyId: string,
  input: { patientId: string; haiType: HaiType; unit: string; onsetDate: string; note?: string | null; createdBy?: string | null },
): Promise<HaiCase> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("hai_cases")
      .insert({
        company_id: companyId, patient_id: input.patientId, hai_type: input.haiType,
        unit: input.unit, onset_date: input.onsetDate, note: input.note ?? null, created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "record HAI case failed");
    return toCase(data as CaseRow);
  }
  const c: HaiCase = {
    id: crypto.randomUUID(), companyId, patientId: input.patientId, haiType: input.haiType,
    unit: input.unit, onsetDate: input.onsetDate, note: input.note ?? null,
    createdBy: input.createdBy ?? null, createdAt: new Date().toISOString(),
  };
  cases.push(c);
  return c;
}

export async function listCases(companyId: string, opts: { period?: string } = {}): Promise<HaiCase[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("hai_cases").select("*").eq("company_id", companyId);
    if (opts.period) q = q.gte("onset_date", `${opts.period}-01`).lte("onset_date", `${opts.period}-31`);
    const { data } = await q.order("onset_date", { ascending: false });
    return (data ?? []).map((r) => toCase(r as CaseRow));
  }
  return cases
    .filter((c) => c.companyId === companyId && (!opts.period || c.onsetDate.slice(0, 7) === opts.period))
    .sort((a, b) => b.onsetDate.localeCompare(a.onsetDate));
}

export async function recordDenominator(
  companyId: string,
  input: { period: string; haiType: HaiType; unit: string; deviceDays: number; createdBy?: string | null },
): Promise<HaiDenominator> {
  const deviceDays = Math.max(0, Math.floor(input.deviceDays));
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("hai_denominators")
      .insert({
        company_id: companyId, period: input.period, hai_type: input.haiType,
        unit: input.unit, device_days: deviceDays, created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "record denominator failed");
    return toDenom(data as DenomRow);
  }
  const d: HaiDenominator = {
    id: crypto.randomUUID(), companyId, period: input.period, haiType: input.haiType,
    unit: input.unit, deviceDays, createdBy: input.createdBy ?? null, createdAt: new Date().toISOString(),
  };
  denoms.push(d);
  return d;
}

export async function listDenominators(companyId: string, opts: { period?: string } = {}): Promise<HaiDenominator[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("hai_denominators").select("*").eq("company_id", companyId);
    if (opts.period) q = q.eq("period", opts.period);
    const { data } = await q.order("period", { ascending: false });
    return (data ?? []).map((r) => toDenom(r as DenomRow));
  }
  return denoms
    .filter((d) => d.companyId === companyId && (!opts.period || d.period === opts.period))
    .sort((a, b) => b.period.localeCompare(a.period));
}

export interface HaiRate {
  haiType: HaiType;
  cases: number;
  deviceDays: number;
  ratePer1000: number | null;
}

/** Incidence density per HAI type, optionally scoped to one period (YYYY-MM). */
export async function surveillanceSummary(companyId: string, period?: string): Promise<HaiRate[]> {
  const [cs, ds] = await Promise.all([
    listCases(companyId, { period }),
    listDenominators(companyId, { period }),
  ]);
  return (["VAP", "IAD", "ISK", "IDO"] as HaiType[]).map((haiType) => {
    const caseCount = cs.filter((c) => c.haiType === haiType).length;
    const deviceDays = ds.filter((d) => d.haiType === haiType).reduce((s, d) => s + d.deviceDays, 0);
    return { haiType, cases: caseCount, deviceDays, ratePer1000: incidenceRate(caseCount, deviceDays) };
  });
}

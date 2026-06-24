/**
 * Tenant payer registry (global revenue cycle). Each payer carries a coverage policy
 * and a currency; `estimateForPayer` runs the pure coverage math (lib/payers) so a
 * hospital in any country can model what a given insurer/scheme covers. Tenant-scoped;
 * env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";
import {
  estimateCoverage,
  type PayerType, type ClaimScheme, type EligibilityStatus, type CoverageEstimate, type Currency,
} from "@/lib/payers";

export interface Payer {
  id: string;
  companyId: string;
  name: string;
  payerType: PayerType;
  scheme: ClaimScheme;
  currency: Currency;
  coveragePercent: number;
  deductible: number;
  copay: number;
  ceiling: number | null;
  eligibilityStatus: EligibilityStatus;
  active: boolean;
  createdAt: string;
}

type Row = {
  id: string; company_id: string; name: string; payer_type: string; scheme: string; currency: string;
  coverage_percent: number; deductible: number; copay: number; ceiling: number | null;
  eligibility_status: string; active: boolean; created_at: string;
};
const toPayer = (r: Row): Payer => ({
  id: r.id, companyId: r.company_id, name: r.name, payerType: r.payer_type as PayerType,
  scheme: r.scheme as ClaimScheme, currency: r.currency as Currency,
  coveragePercent: Number(r.coverage_percent), deductible: Number(r.deductible), copay: Number(r.copay),
  ceiling: r.ceiling == null ? null : Number(r.ceiling),
  eligibilityStatus: r.eligibility_status as EligibilityStatus, active: !!r.active, createdAt: r.created_at,
});

const g = globalThis as unknown as { __abeccaPayers?: Payer[] };
const payers = g.__abeccaPayers ?? (g.__abeccaPayers = []);

const clampPct = (n: number): number => Math.min(100, Math.max(0, Math.round(Number.isFinite(n) ? n : 0)));
const nonNeg = (n: number): number => Math.max(0, Math.round(Number.isFinite(n) ? n : 0));

export interface PayerInput {
  name: string;
  payerType: PayerType;
  scheme: ClaimScheme;
  currency: Currency;
  coveragePercent: number;
  deductible?: number;
  copay?: number;
  ceiling?: number | null;
  eligibilityStatus?: EligibilityStatus;
  createdBy?: string | null;
}

export async function createPayer(companyId: string, input: PayerInput): Promise<Payer> {
  const ceiling = input.ceiling == null ? null : nonNeg(input.ceiling);
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("payers")
      .insert({
        company_id: companyId, name: input.name, payer_type: input.payerType, scheme: input.scheme,
        currency: input.currency, coverage_percent: clampPct(input.coveragePercent),
        deductible: nonNeg(input.deductible ?? 0), copay: nonNeg(input.copay ?? 0), ceiling,
        eligibility_status: input.eligibilityStatus ?? "unknown", active: true, created_by: input.createdBy ?? null,
      })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "create payer failed");
    return toPayer(data as Row);
  }
  const payer: Payer = {
    id: crypto.randomUUID(), companyId, name: input.name, payerType: input.payerType, scheme: input.scheme,
    currency: input.currency, coveragePercent: clampPct(input.coveragePercent),
    deductible: nonNeg(input.deductible ?? 0), copay: nonNeg(input.copay ?? 0), ceiling,
    eligibilityStatus: input.eligibilityStatus ?? "unknown", active: true, createdAt: new Date().toISOString(),
  };
  payers.push(payer);
  return payer;
}

export async function listPayers(companyId: string, opts: { activeOnly?: boolean } = {}): Promise<Payer[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("payers").select("*").eq("company_id", companyId);
    if (opts.activeOnly) q = q.eq("active", true);
    const { data } = await q.order("name");
    return (data ?? []).map((r) => toPayer(r as Row));
  }
  return payers
    .filter((p) => p.companyId === companyId && (!opts.activeOnly || p.active))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPayer(companyId: string, id: string): Promise<Payer | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("payers").select("*").eq("company_id", companyId).eq("id", id).maybeSingle();
    return data ? toPayer(data as Row) : undefined;
  }
  return payers.find((p) => p.companyId === companyId && p.id === id);
}

export async function updatePayer(
  companyId: string,
  id: string,
  patch: Partial<Pick<Payer, "coveragePercent" | "deductible" | "copay" | "ceiling" | "eligibilityStatus" | "active">>,
): Promise<Payer | undefined> {
  const fields: Record<string, unknown> = {};
  if (patch.coveragePercent !== undefined) fields.coverage_percent = clampPct(patch.coveragePercent);
  if (patch.deductible !== undefined) fields.deductible = nonNeg(patch.deductible);
  if (patch.copay !== undefined) fields.copay = nonNeg(patch.copay);
  if (patch.ceiling !== undefined) fields.ceiling = patch.ceiling == null ? null : nonNeg(patch.ceiling);
  if (patch.eligibilityStatus !== undefined) fields.eligibility_status = patch.eligibilityStatus;
  if (patch.active !== undefined) fields.active = patch.active;

  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("payers").update(fields).eq("company_id", companyId).eq("id", id).select("*").maybeSingle();
    return data ? toPayer(data as Row) : undefined;
  }
  const payer = payers.find((p) => p.companyId === companyId && p.id === id);
  if (!payer) return undefined;
  if (patch.coveragePercent !== undefined) payer.coveragePercent = clampPct(patch.coveragePercent);
  if (patch.deductible !== undefined) payer.deductible = nonNeg(patch.deductible);
  if (patch.copay !== undefined) payer.copay = nonNeg(patch.copay);
  if (patch.ceiling !== undefined) payer.ceiling = patch.ceiling == null ? null : nonNeg(patch.ceiling);
  if (patch.eligibilityStatus !== undefined) payer.eligibilityStatus = patch.eligibilityStatus;
  if (patch.active !== undefined) payer.active = patch.active;
  return payer;
}

/** Estimate payer-covered vs patient-responsibility for a gross amount (payer's currency). */
export async function estimateForPayer(
  companyId: string,
  payerId: string,
  gross: number,
): Promise<(CoverageEstimate & { currency: Currency }) | undefined> {
  const payer = await getPayer(companyId, payerId);
  if (!payer) return undefined;
  const estimate = estimateCoverage(gross, {
    coveragePercent: payer.coveragePercent,
    deductible: payer.deductible,
    copay: payer.copay,
    ceiling: payer.ceiling,
  });
  return { ...estimate, currency: payer.currency };
}

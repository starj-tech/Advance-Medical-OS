/**
 * Indikator Nasional Mutu (INM) entries. One numerator/denominator value per
 * indicator per period (YYYY-MM) — recording is an upsert on (company, period,
 * code). The report merges the 13-indicator catalogue (lib/inm) with the recorded
 * values and computes achievement % + whether the national target is met.
 * Tenant-scoped; env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";
import {
  INM_INDICATORS,
  achievementPct,
  meetsTarget,
  type InmDirection,
} from "@/lib/inm";

export interface InmEntry {
  id: string;
  companyId: string;
  period: string;
  code: string;
  numerator: number;
  denominator: number;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

type Row = {
  id: string; company_id: string; period: string; code: string;
  numerator: number; denominator: number; note: string | null;
  created_by: string | null; created_at: string;
};
const toEntry = (r: Row): InmEntry => ({
  id: r.id, companyId: r.company_id, period: r.period, code: r.code,
  numerator: Number(r.numerator), denominator: Number(r.denominator), note: r.note,
  createdBy: r.created_by, createdAt: r.created_at,
});

const g = globalThis as unknown as { __abeccaInm?: InmEntry[] };
const mem = g.__abeccaInm ?? (g.__abeccaInm = []);

export async function recordInmEntry(
  companyId: string,
  input: { period: string; code: string; numerator: number; denominator: number; note?: string | null; createdBy?: string | null },
): Promise<InmEntry> {
  const numerator = Math.max(0, Math.floor(input.numerator));
  const denominator = Math.max(0, Math.floor(input.denominator));
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("inm_entries")
      .upsert(
        { company_id: companyId, period: input.period, code: input.code, numerator, denominator, note: input.note ?? null, created_by: input.createdBy ?? null },
        { onConflict: "company_id,period,code" },
      )
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "record INM entry failed");
    return toEntry(data as Row);
  }
  const existing = mem.find((e) => e.companyId === companyId && e.period === input.period && e.code === input.code);
  if (existing) {
    existing.numerator = numerator;
    existing.denominator = denominator;
    existing.note = input.note ?? null;
    return existing;
  }
  const entry: InmEntry = {
    id: crypto.randomUUID(), companyId, period: input.period, code: input.code,
    numerator, denominator, note: input.note ?? null, createdBy: input.createdBy ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(entry);
  return entry;
}

export async function listInmEntries(companyId: string, period: string): Promise<InmEntry[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("inm_entries").select("*").eq("company_id", companyId).eq("period", period);
    return (data ?? []).map((r) => toEntry(r as Row));
  }
  return mem.filter((e) => e.companyId === companyId && e.period === period);
}

export interface InmReportRow {
  code: string;
  name: string;
  target: number;
  direction: InmDirection;
  numerator: number | null;
  denominator: number | null;
  achievementPct: number | null;
  met: boolean | null;
}

/** The full 13-indicator report for a period, merged with recorded values. */
export async function inmReport(companyId: string, period: string): Promise<InmReportRow[]> {
  const entries = await listInmEntries(companyId, period);
  const byCode = new Map(entries.map((e) => [e.code, e]));
  return INM_INDICATORS.map((ind) => {
    const e = byCode.get(ind.code);
    const pct = e ? achievementPct(e.numerator, e.denominator) : null;
    return {
      code: ind.code,
      name: ind.name,
      target: ind.target,
      direction: ind.direction,
      numerator: e ? e.numerator : null,
      denominator: e ? e.denominator : null,
      achievementPct: pct,
      met: meetsTarget(pct, ind.target, ind.direction),
    };
  });
}

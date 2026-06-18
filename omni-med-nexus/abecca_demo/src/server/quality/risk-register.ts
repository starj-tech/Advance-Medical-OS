/**
 * Risk register (manajemen risiko korporat, KARS-PMKP) — proactive companion to the
 * reactive IKP module. Each entry carries a likelihood and consequence; the score and
 * band are derived purely (lib/risk-matrix) so the register, the 5×5 heatmap, and the
 * summary always agree. The summary's matrix and band profile count OPEN (non-closed)
 * risks — the live risk picture. Tenant-scoped; env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";
import {
  riskScore, riskBand, bandFor,
  type RiskBand, type RiskStatus, type RiskCategory,
} from "@/lib/risk-matrix";

export interface RiskEntry {
  id: string;
  companyId: string;
  title: string;
  category: RiskCategory;
  description: string | null;
  likelihood: number;
  consequence: number;
  owner: string | null;
  mitigation: string | null;
  status: RiskStatus;
  createdAt: string;
  updatedAt: string;
}
export interface RiskView extends RiskEntry {
  score: number;
  band: RiskBand;
}

type Row = {
  id: string; company_id: string; title: string; category: string; description: string | null;
  likelihood: number; consequence: number; owner: string | null; mitigation: string | null;
  status: string; created_at: string; updated_at: string;
};
const toEntry = (r: Row): RiskEntry => ({
  id: r.id, companyId: r.company_id, title: r.title, category: r.category as RiskCategory,
  description: r.description, likelihood: Number(r.likelihood), consequence: Number(r.consequence),
  owner: r.owner, mitigation: r.mitigation, status: r.status as RiskStatus,
  createdAt: r.created_at, updatedAt: r.updated_at,
});
const view = (e: RiskEntry): RiskView => ({ ...e, score: riskScore(e.likelihood, e.consequence), band: riskBand(riskScore(e.likelihood, e.consequence)) });
const clamp = (n: number): number => Math.min(5, Math.max(1, Math.round(n)));

const g = globalThis as unknown as { __abeccaRisks?: RiskEntry[] };
const risks = g.__abeccaRisks ?? (g.__abeccaRisks = []);

export async function createRisk(
  companyId: string,
  input: { title: string; category: RiskCategory; description?: string | null; likelihood: number; consequence: number; owner?: string | null; mitigation?: string | null; createdBy?: string | null },
): Promise<RiskView> {
  const likelihood = clamp(input.likelihood);
  const consequence = clamp(input.consequence);
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("risk_entries")
      .insert({ company_id: companyId, title: input.title, category: input.category, description: input.description ?? null, likelihood, consequence, owner: input.owner ?? null, mitigation: input.mitigation ?? null, status: "identified", created_by: input.createdBy ?? null })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "create risk failed");
    return view(toEntry(data as Row));
  }
  const entry: RiskEntry = {
    id: crypto.randomUUID(), companyId, title: input.title, category: input.category,
    description: input.description ?? null, likelihood, consequence, owner: input.owner ?? null,
    mitigation: input.mitigation ?? null, status: "identified", createdAt: now, updatedAt: now,
  };
  risks.push(entry);
  return view(entry);
}

export async function listRisks(companyId: string, opts: { status?: RiskStatus } = {}): Promise<RiskView[]> {
  const sb = getSupabase();
  let rows: RiskEntry[];
  if (sb) {
    let q = sb.from("risk_entries").select("*").eq("company_id", companyId);
    if (opts.status) q = q.eq("status", opts.status);
    const { data } = await q;
    rows = (data ?? []).map((r) => toEntry(r as Row));
  } else {
    rows = risks.filter((r) => r.companyId === companyId && (!opts.status || r.status === opts.status));
  }
  // Highest risk first, then most recent.
  return rows
    .map(view)
    .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt));
}

export async function updateRisk(
  companyId: string,
  id: string,
  patch: { status?: RiskStatus; likelihood?: number; consequence?: number; owner?: string | null; mitigation?: string | null },
): Promise<RiskView | undefined> {
  const fields: Partial<Pick<RiskEntry, "status" | "likelihood" | "consequence" | "owner" | "mitigation">> = {};
  if (patch.status) fields.status = patch.status;
  if (patch.likelihood !== undefined) fields.likelihood = clamp(patch.likelihood);
  if (patch.consequence !== undefined) fields.consequence = clamp(patch.consequence);
  if (patch.owner !== undefined) fields.owner = patch.owner;
  if (patch.mitigation !== undefined) fields.mitigation = patch.mitigation;
  const now = new Date().toISOString();

  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("risk_entries").update({ ...fields, updated_at: now }).eq("company_id", companyId).eq("id", id).select("*").maybeSingle();
    return data ? view(toEntry(data as Row)) : undefined;
  }
  const entry = risks.find((r) => r.companyId === companyId && r.id === id);
  if (!entry) return undefined;
  Object.assign(entry, fields, { updatedAt: now });
  return view(entry);
}

export interface RiskSummary {
  total: number;
  byStatus: Record<RiskStatus, number>;
  byBand: Record<RiskBand, number>;
  /** Counts of OPEN risks per cell, indexed matrix[likelihood-1][consequence-1]. */
  matrix: number[][];
}

export async function riskSummary(companyId: string): Promise<RiskSummary> {
  const all = await listRisks(companyId);
  const byStatus: Record<RiskStatus, number> = { identified: 0, mitigating: 0, monitored: 0, closed: 0 };
  const byBand: Record<RiskBand, number> = { low: 0, moderate: 0, high: 0, extreme: 0 };
  const matrix: number[][] = Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]);
  for (const r of all) {
    byStatus[r.status] += 1;
    if (r.status === "closed") continue; // open risk profile only
    byBand[r.band] += 1;
    matrix[clamp(r.likelihood) - 1][clamp(r.consequence) - 1] += 1;
  }
  return { total: all.length, byStatus, byBand, matrix };
}

export { bandFor };

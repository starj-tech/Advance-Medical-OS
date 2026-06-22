/**
 * Nursing risk assessments (Domain E) — bedside Morse (fall) and Braden (pressure injury)
 * scale results, one row per assessment. The score and band are computed server-side from the
 * submitted item answers via the pure scale module, so a client can never post a mismatched
 * total. Tenant-scoped by company_id; env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";
import { scoreAssessment, isHighRisk, type ScaleKind } from "@/lib/nursing-scales";

export interface NursingAssessment {
  id: string;
  companyId: string;
  patientId: string;
  patientName: string;
  scale: ScaleKind;
  score: number;
  band: string;
  items: Record<string, unknown>;
  note: string | null;
  assessedBy: string | null;
  assessedAt: string;
}

type Row = {
  id: string; company_id: string; patient_id: string; patient_name: string; scale: ScaleKind;
  score: number; band: string; items: Record<string, unknown>; note: string | null;
  assessed_by: string | null; assessed_at: string;
};
const toAssessment = (r: Row): NursingAssessment => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, patientName: r.patient_name, scale: r.scale,
  score: Number(r.score), band: r.band, items: r.items ?? {}, note: r.note,
  assessedBy: r.assessed_by, assessedAt: r.assessed_at,
});

const g = globalThis as unknown as { __abeccaNursingAssessments?: NursingAssessment[] };
const mem = g.__abeccaNursingAssessments ?? (g.__abeccaNursingAssessments = []);

export type RecordResult =
  | { ok: true; assessment: NursingAssessment }
  | { ok: false; reason: "invalid_items" };

/**
 * Record a scale result. The score/band are derived from `items` server-side; invalid or
 * out-of-range answers are rejected so a stored band always matches its items.
 */
export async function recordAssessment(
  companyId: string,
  input: { patientId: string; patientName: string; scale: ScaleKind; items: unknown; note?: string | null; assessedBy?: string | null },
): Promise<RecordResult> {
  const scored = scoreAssessment(input.scale, input.items);
  if (!scored) return { ok: false, reason: "invalid_items" };
  const note = input.note?.trim() || null;

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("nursing_assessments")
      .insert({
        company_id: companyId, patient_id: input.patientId, patient_name: input.patientName,
        scale: input.scale, score: scored.score, band: scored.band, items: scored.items,
        note, assessed_by: input.assessedBy ?? null,
      })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "record assessment failed");
    return { ok: true, assessment: toAssessment(data as Row) };
  }
  const assessment: NursingAssessment = {
    id: crypto.randomUUID(), companyId, patientId: input.patientId, patientName: input.patientName,
    scale: input.scale, score: scored.score, band: scored.band, items: scored.items as unknown as Record<string, unknown>,
    note, assessedBy: input.assessedBy ?? null, assessedAt: new Date().toISOString(),
  };
  mem.push(assessment);
  return { ok: true, assessment };
}

export async function listAssessments(
  companyId: string,
  filter: { patientId?: string; scale?: ScaleKind } = {},
): Promise<NursingAssessment[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("nursing_assessments").select("*").eq("company_id", companyId);
    if (filter.patientId) q = q.eq("patient_id", filter.patientId);
    if (filter.scale) q = q.eq("scale", filter.scale);
    const { data } = await q.order("assessed_at", { ascending: false });
    return (data ?? []).map((r) => toAssessment(r as Row));
  }
  return mem
    .filter((a) => a.companyId === companyId
      && (!filter.patientId || a.patientId === filter.patientId)
      && (!filter.scale || a.scale === filter.scale))
    .sort((a, b) => b.assessedAt.localeCompare(a.assessedAt));
}

export interface AssessmentSummary {
  total: number;
  byScale: { morse: number; braden: number };
  highRisk: number;
}
export async function assessmentSummary(companyId: string): Promise<AssessmentSummary> {
  const all = await listAssessments(companyId);
  return {
    total: all.length,
    byScale: {
      morse: all.filter((a) => a.scale === "morse").length,
      braden: all.filter((a) => a.scale === "braden").length,
    },
    highRisk: all.filter((a) => isHighRisk(a.scale, a.band)).length,
  };
}

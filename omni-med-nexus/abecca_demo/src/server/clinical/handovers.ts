/**
 * SBAR handovers / serah-terima pasien (Domain E). One row per handover between staff, capturing
 * the four SBAR parts. A handover is created only when complete (all four parts present) and is
 * acknowledged once by the receiving nurse. Tenant-scoped by company_id; env-gated.
 */
import { getSupabase } from "../supabase";
import { isComplete, isHandoverShift, type HandoverStatus, type HandoverShift, type SbarParts } from "@/lib/sbar";

export interface Handover {
  id: string;
  companyId: string;
  patientId: string;
  patientName: string;
  fromStaff: string;
  toStaff: string | null;
  shift: HandoverShift | null;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  status: HandoverStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

type Row = {
  id: string; company_id: string; patient_id: string; patient_name: string; from_staff: string;
  to_staff: string | null; shift: HandoverShift | null; situation: string; background: string;
  assessment: string; recommendation: string; status: HandoverStatus;
  acknowledged_by: string | null; acknowledged_at: string | null; created_at: string;
};
const toHandover = (r: Row): Handover => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, patientName: r.patient_name,
  fromStaff: r.from_staff, toStaff: r.to_staff, shift: r.shift, situation: r.situation,
  background: r.background, assessment: r.assessment, recommendation: r.recommendation,
  status: r.status, acknowledgedBy: r.acknowledged_by, acknowledgedAt: r.acknowledged_at, createdAt: r.created_at,
});

const g = globalThis as unknown as { __abeccaHandovers?: Handover[] };
const mem = g.__abeccaHandovers ?? (g.__abeccaHandovers = []);

export type RecordResult =
  | { ok: true; handover: Handover }
  | { ok: false; reason: "incomplete" };

/** Record a complete SBAR handover (status pending). Rejects when any SBAR part is blank. */
export async function recordHandover(
  companyId: string,
  input: {
    patientId: string; patientName: string; fromStaff: string; toStaff?: string | null;
    shift?: string | null;
  } & SbarParts,
): Promise<RecordResult> {
  if (!isComplete(input)) return { ok: false, reason: "incomplete" };
  const shift = isHandoverShift(input.shift) ? input.shift : null;
  const toStaff = input.toStaff?.trim() || null;
  const parts = {
    situation: input.situation.trim(), background: input.background.trim(),
    assessment: input.assessment.trim(), recommendation: input.recommendation.trim(),
  };

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("handovers")
      .insert({
        company_id: companyId, patient_id: input.patientId, patient_name: input.patientName,
        from_staff: input.fromStaff, to_staff: toStaff, shift, status: "pending", ...parts,
      })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "record handover failed");
    return { ok: true, handover: toHandover(data as Row) };
  }
  const handover: Handover = {
    id: crypto.randomUUID(), companyId, patientId: input.patientId, patientName: input.patientName,
    fromStaff: input.fromStaff, toStaff, shift, ...parts, status: "pending",
    acknowledgedBy: null, acknowledgedAt: null, createdAt: new Date().toISOString(),
  };
  mem.push(handover);
  return { ok: true, handover };
}

async function getHandover(companyId: string, id: string): Promise<Handover | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("handovers").select("*").eq("company_id", companyId).eq("id", id).maybeSingle();
    return data ? toHandover(data as Row) : undefined;
  }
  return mem.find((h) => h.companyId === companyId && h.id === id);
}

export type AcknowledgeResult =
  | { ok: true; handover: Handover }
  | { ok: false; reason: "not_found" | "already_acknowledged" };

/** Mark a pending handover acknowledged by the receiving nurse (idempotent guard). */
export async function acknowledgeHandover(
  companyId: string, id: string, input: { acknowledgedBy?: string | null },
): Promise<AcknowledgeResult> {
  const handover = await getHandover(companyId, id);
  if (!handover) return { ok: false, reason: "not_found" };
  if (handover.status === "acknowledged") return { ok: false, reason: "already_acknowledged" };
  const acknowledgedAt = new Date().toISOString();

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("handovers")
      .update({ status: "acknowledged", acknowledged_by: input.acknowledgedBy ?? null, acknowledged_at: acknowledgedAt })
      .eq("company_id", companyId).eq("id", id).select("*").single();
    if (error || !data) throw new Error(error?.message ?? "acknowledge handover failed");
    return { ok: true, handover: toHandover(data as Row) };
  }
  handover.status = "acknowledged";
  handover.acknowledgedBy = input.acknowledgedBy ?? null;
  handover.acknowledgedAt = acknowledgedAt;
  return { ok: true, handover };
}

export async function listHandovers(
  companyId: string,
  filter: { patientId?: string; status?: HandoverStatus } = {},
): Promise<Handover[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("handovers").select("*").eq("company_id", companyId);
    if (filter.patientId) q = q.eq("patient_id", filter.patientId);
    if (filter.status) q = q.eq("status", filter.status);
    const { data } = await q.order("created_at", { ascending: false });
    return (data ?? []).map((r) => toHandover(r as Row));
  }
  return mem
    .filter((h) => h.companyId === companyId
      && (!filter.patientId || h.patientId === filter.patientId)
      && (!filter.status || h.status === filter.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface HandoverSummary {
  total: number;
  pending: number;
  acknowledged: number;
}
export async function handoverSummary(companyId: string): Promise<HandoverSummary> {
  const all = await listHandovers(companyId);
  return {
    total: all.length,
    pending: all.filter((h) => h.status === "pending").length,
    acknowledged: all.filter((h) => h.status === "acknowledged").length,
  };
}

/**
 * Emergency department triage + tracking board. A walk-in is triaged with the ESI
 * algorithm (recomputed server-side from the triage answers — authoritative), then
 * tracked through doctor contact (door-to-doctor) to disposition. The board sorts
 * by acuity (ESI 1 first) then arrival time. Tenant-scoped; env-gated.
 */
import { getSupabase } from "../supabase";
import { computeEsi, type EsiInput, type EsiLevel } from "@/lib/esi";
import type { EdDisposition, EdStatus } from "@/lib/ed";

export interface EdVisit {
  id: string;
  companyId: string;
  patientId: string;
  complaint: string;
  esiLevel: EsiLevel;
  esiRationale: string;
  status: EdStatus;
  disposition: EdDisposition | null;
  arrivalAt: string;
  doctorSeenAt: string | null;
  dispositionAt: string | null;
  createdBy: string | null;
}

type Row = {
  id: string; company_id: string; patient_id: string; complaint: string;
  esi_level: EsiLevel; esi_rationale: string; status: EdStatus;
  disposition: EdDisposition | null; arrival_at: string; doctor_seen_at: string | null;
  disposition_at: string | null; created_by: string | null;
};
const toVisit = (r: Row): EdVisit => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, complaint: r.complaint,
  esiLevel: r.esi_level, esiRationale: r.esi_rationale, status: r.status,
  disposition: r.disposition, arrivalAt: r.arrival_at, doctorSeenAt: r.doctor_seen_at,
  dispositionAt: r.disposition_at, createdBy: r.created_by,
});

const g = globalThis as unknown as { __abeccaEdVisits?: EdVisit[] };
const mem = g.__abeccaEdVisits ?? (g.__abeccaEdVisits = []);

/** Acuity-first ordering: ESI ascending (1 = most acute), then earliest arrival. */
const byPriority = (a: EdVisit, b: EdVisit): number =>
  a.esiLevel - b.esiLevel || a.arrivalAt.localeCompare(b.arrivalAt);

export async function createEdVisit(
  companyId: string,
  input: { patientId: string; complaint: string; esi: EsiInput; createdBy?: string | null },
): Promise<EdVisit> {
  const { level, rationale } = computeEsi(input.esi);
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("ed_visits")
      .insert({
        company_id: companyId, patient_id: input.patientId, complaint: input.complaint,
        esi_level: level, esi_rationale: rationale, status: "waiting",
        arrival_at: now, created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create ED visit failed");
    return toVisit(data as Row);
  }
  const visit: EdVisit = {
    id: crypto.randomUUID(), companyId, patientId: input.patientId, complaint: input.complaint,
    esiLevel: level, esiRationale: rationale, status: "waiting", disposition: null,
    arrivalAt: now, doctorSeenAt: null, dispositionAt: null, createdBy: input.createdBy ?? null,
  };
  mem.push(visit);
  return visit;
}

export async function listEdVisits(
  companyId: string,
  opts: { active?: boolean } = {},
): Promise<EdVisit[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("ed_visits").select("*").eq("company_id", companyId);
    if (opts.active) q = q.neq("status", "disposition");
    const { data } = await q;
    return (data ?? []).map((r) => toVisit(r as Row)).sort(byPriority);
  }
  return mem
    .filter((v) => v.companyId === companyId && (!opts.active || v.status !== "disposition"))
    .sort(byPriority);
}

export async function getEdVisit(companyId: string, id: string): Promise<EdVisit | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("ed_visits").select("*").eq("company_id", companyId).eq("id", id).maybeSingle();
    return data ? toVisit(data as Row) : undefined;
  }
  return mem.find((v) => v.companyId === companyId && v.id === id);
}

/** Record first doctor contact (door-to-doctor) — idempotent. */
export async function markSeen(companyId: string, id: string): Promise<EdVisit | undefined> {
  const existing = await getEdVisit(companyId, id);
  if (!existing) return undefined;
  if (existing.doctorSeenAt) return existing;
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("ed_visits")
      .update({ doctor_seen_at: now, status: "in_treatment" })
      .eq("company_id", companyId).eq("id", id).select("*").maybeSingle();
    return data ? toVisit(data as Row) : undefined;
  }
  existing.doctorSeenAt = now;
  existing.status = "in_treatment";
  return existing;
}

export async function setDisposition(
  companyId: string,
  id: string,
  disposition: EdDisposition,
): Promise<EdVisit | undefined> {
  const existing = await getEdVisit(companyId, id);
  if (!existing) return undefined;
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("ed_visits")
      .update({ disposition, disposition_at: now, status: "disposition" })
      .eq("company_id", companyId).eq("id", id).select("*").maybeSingle();
    return data ? toVisit(data as Row) : undefined;
  }
  existing.disposition = disposition;
  existing.dispositionAt = now;
  existing.status = "disposition";
  return existing;
}

export interface EdMetrics {
  waiting: number;
  inTreatment: number;
  byLevel: Record<EsiLevel, number>;
  avgDoorToDoctorMin: number | null;
}

/** Board roll-up: active counts by level + average door-to-doctor over seen visits. */
export async function edMetrics(companyId: string): Promise<EdMetrics> {
  const all = await listEdVisits(companyId);
  const byLevel: Record<EsiLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let waiting = 0;
  let inTreatment = 0;
  const doorMins: number[] = [];
  for (const v of all) {
    if (v.status !== "disposition") {
      byLevel[v.esiLevel] += 1;
      if (v.status === "waiting") waiting += 1;
      if (v.status === "in_treatment") inTreatment += 1;
    }
    if (v.doctorSeenAt) {
      doorMins.push((new Date(v.doctorSeenAt).getTime() - new Date(v.arrivalAt).getTime()) / 60_000);
    }
  }
  const avgDoorToDoctorMin = doorMins.length
    ? Math.round((doorMins.reduce((s, m) => s + m, 0) / doorMins.length) * 10) / 10
    : null;
  return { waiting, inTreatment, byLevel, avgDoorToDoctorMin };
}

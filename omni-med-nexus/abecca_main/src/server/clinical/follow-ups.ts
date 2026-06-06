/**
 * Follow-up / recall reminders (pengingat kontrol ulang). A DPJP schedules a
 * future recall from an encounter (due date + reason); front desk later dispatches
 * the day's due reminders, which fan out to the DPJP (in-app) and the patient
 * (WhatsApp). Closes the loop: schedule → jatuh tempo → kirim pengingat.
 * Tenant-scoped by company_id; env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";

export type FollowUpStatus = "scheduled" | "sent" | "cancelled";
export const FOLLOWUP_STATUSES: FollowUpStatus[] = ["scheduled", "sent", "cancelled"];

export interface FollowUp {
  id: string;
  companyId: string;
  encounterId: string;
  patientId: string;
  dueDate: string; // YYYY-MM-DD
  reason: string;
  patientPhone: string | null;
  notifyUserId: string | null;
  status: FollowUpStatus;
  createdBy: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface CreateFollowUpInput {
  patientId: string;
  dueDate: string;
  reason: string;
  patientPhone?: string | null;
  notifyUserId?: string | null;
  createdBy?: string | null;
}

const g = globalThis as unknown as { __abeccaFollowUps?: FollowUp[] };
const mem = g.__abeccaFollowUps ?? (g.__abeccaFollowUps = []);

type Row = {
  id: string; company_id: string; encounter_id: string; patient_id: string;
  due_date: string; reason: string; patient_phone: string | null;
  notify_user_id: string | null; status: FollowUpStatus; created_by: string | null;
  created_at: string; sent_at: string | null;
};
const toFollowUp = (r: Row): FollowUp => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  dueDate: r.due_date, reason: r.reason, patientPhone: r.patient_phone,
  notifyUserId: r.notify_user_id, status: r.status, createdBy: r.created_by,
  createdAt: r.created_at, sentAt: r.sent_at,
});

export async function createFollowUp(
  companyId: string,
  encounterId: string,
  input: CreateFollowUpInput,
): Promise<FollowUp> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("follow_ups")
      .insert({
        company_id: companyId,
        encounter_id: encounterId,
        patient_id: input.patientId,
        due_date: input.dueDate,
        reason: input.reason,
        patient_phone: input.patientPhone ?? null,
        notify_user_id: input.notifyUserId ?? null,
        status: "scheduled",
        created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create follow-up failed");
    return toFollowUp(data as Row);
  }
  const fu: FollowUp = {
    id: crypto.randomUUID(),
    companyId,
    encounterId,
    patientId: input.patientId,
    dueDate: input.dueDate,
    reason: input.reason,
    patientPhone: input.patientPhone ?? null,
    notifyUserId: input.notifyUserId ?? null,
    status: "scheduled",
    createdBy: input.createdBy ?? null,
    createdAt: new Date().toISOString(),
    sentAt: null,
  };
  mem.push(fu);
  return fu;
}

/** Reminders for one encounter, earliest due date first. */
export async function listFollowUps(
  companyId: string,
  encounterId: string,
): Promise<FollowUp[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("follow_ups")
      .select("*")
      .eq("company_id", companyId)
      .eq("encounter_id", encounterId)
      .order("due_date", { ascending: true });
    return (data ?? []).map((r) => toFollowUp(r as Row));
  }
  return mem
    .filter((f) => f.companyId === companyId && f.encounterId === encounterId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Company-wide reminders still scheduled (pending), earliest due first. */
export async function listUpcomingFollowUps(companyId: string): Promise<FollowUp[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("follow_ups")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "scheduled")
      .order("due_date", { ascending: true });
    return (data ?? []).map((r) => toFollowUp(r as Row));
  }
  return mem
    .filter((f) => f.companyId === companyId && f.status === "scheduled")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Scheduled reminders that are due on/before `asOf` (YYYY-MM-DD). */
export async function listDueFollowUps(companyId: string, asOf: string): Promise<FollowUp[]> {
  return (await listUpcomingFollowUps(companyId)).filter((f) => f.dueDate <= asOf);
}

export async function setFollowUpStatus(
  companyId: string,
  id: string,
  status: FollowUpStatus,
): Promise<FollowUp | undefined> {
  const sentAt = status === "sent" ? new Date().toISOString() : null;
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("follow_ups")
      .update({ status, sent_at: sentAt })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toFollowUp(data as Row) : undefined;
  }
  const f = mem.find((x) => x.companyId === companyId && x.id === id);
  if (!f) return undefined;
  f.status = status;
  f.sentAt = sentAt;
  return f;
}

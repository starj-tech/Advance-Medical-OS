/**
 * Outpatient registration & queue (pendaftaran + antrian). A front-desk visit is
 * registered against a poliklinik; a per-clinic, per-day sequential queue number
 * is assigned and the visit is tied to an outpatient encounter (the clinical
 * backbone). Tenant-scoped by company_id; env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";

export type QueueStatus = "waiting" | "called" | "in_service" | "done" | "no_show";
export const QUEUE_STATUSES: QueueStatus[] = ["waiting", "called", "in_service", "done", "no_show"];

export interface QueueTicket {
  id: string;
  companyId: string;
  patientId: string;
  polyclinic: string;
  queueDate: string; // YYYY-MM-DD
  queueNumber: number;
  status: QueueStatus;
  encounterId: string | null;
  createdAt: string;
  calledAt: string | null;
}

export interface CreateTicketInput {
  patientId: string;
  polyclinic: string;
  encounterId?: string | null;
}

const g = globalThis as unknown as { __abeccaQueue?: QueueTicket[] };
const mem = g.__abeccaQueue ?? (g.__abeccaQueue = []);

const today = (): string => new Date().toISOString().slice(0, 10);

type Row = {
  id: string; company_id: string; patient_id: string; polyclinic: string;
  queue_date: string; queue_number: number; status: QueueStatus;
  encounter_id: string | null; created_at: string; called_at: string | null;
};
const toTicket = (r: Row): QueueTicket => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, polyclinic: r.polyclinic,
  queueDate: r.queue_date, queueNumber: r.queue_number, status: r.status,
  encounterId: r.encounter_id, createdAt: r.created_at, calledAt: r.called_at,
});

/** Next sequential number for a clinic on a given day (1-based). */
async function nextNumber(companyId: string, polyclinic: string, date: string): Promise<number> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("queue_tickets")
      .select("queue_number")
      .eq("company_id", companyId)
      .eq("polyclinic", polyclinic)
      .eq("queue_date", date)
      .order("queue_number", { ascending: false })
      .limit(1)
      .maybeSingle<{ queue_number: number }>();
    return (data?.queue_number ?? 0) + 1;
  }
  const max = mem
    .filter((t) => t.companyId === companyId && t.polyclinic === polyclinic && t.queueDate === date)
    .reduce((m, t) => Math.max(m, t.queueNumber), 0);
  return max + 1;
}

export async function createTicket(
  companyId: string,
  input: CreateTicketInput,
): Promise<QueueTicket> {
  const date = today();
  const queueNumber = await nextNumber(companyId, input.polyclinic, date);
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("queue_tickets")
      .insert({
        company_id: companyId,
        patient_id: input.patientId,
        polyclinic: input.polyclinic,
        queue_date: date,
        queue_number: queueNumber,
        status: "waiting",
        encounter_id: input.encounterId ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create ticket failed");
    return toTicket(data as Row);
  }
  const ticket: QueueTicket = {
    id: crypto.randomUUID(),
    companyId,
    patientId: input.patientId,
    polyclinic: input.polyclinic,
    queueDate: date,
    queueNumber,
    status: "waiting",
    encounterId: input.encounterId ?? null,
    createdAt: new Date().toISOString(),
    calledAt: null,
  };
  mem.push(ticket);
  return ticket;
}

export async function listQueue(companyId: string, date?: string): Promise<QueueTicket[]> {
  const day = date ?? today();
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("queue_tickets")
      .select("*")
      .eq("company_id", companyId)
      .eq("queue_date", day)
      .order("polyclinic", { ascending: true })
      .order("queue_number", { ascending: true });
    return (data ?? []).map((r) => toTicket(r as Row));
  }
  return mem
    .filter((t) => t.companyId === companyId && t.queueDate === day)
    .sort((a, b) => a.polyclinic.localeCompare(b.polyclinic) || a.queueNumber - b.queueNumber);
}

export async function setTicketStatus(
  companyId: string,
  id: string,
  status: QueueStatus,
): Promise<QueueTicket | undefined> {
  const calledAt = status === "called" ? new Date().toISOString() : undefined;
  const sb = getSupabase();
  if (sb) {
    const patch: Record<string, unknown> = { status };
    if (calledAt) patch.called_at = calledAt;
    const { data } = await sb
      .from("queue_tickets")
      .update(patch)
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toTicket(data as Row) : undefined;
  }
  const t = mem.find((x) => x.companyId === companyId && x.id === id);
  if (!t) return undefined;
  t.status = status;
  if (calledAt) t.calledAt = calledAt;
  return t;
}

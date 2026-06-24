/**
 * Appointment scheduling (janji temu). A future-dated booking of a patient into a
 * poliklinik with an optional practitioner. An appointment runs scheduled →
 * checked_in (the patient arrives and is pushed into today's registration queue,
 * recorded via queueTicketId) / cancelled / no_show. Tenant-scoped by company_id;
 * env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";
import type { AppointmentModality } from "@/lib/appointments";

export type AppointmentStatus = "scheduled" | "checked_in" | "cancelled" | "no_show";
export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "scheduled", "checked_in", "cancelled", "no_show",
];

export interface Appointment {
  id: string;
  companyId: string;
  patientId: string;
  polyclinic: string;
  practitioner: string | null;
  scheduledAt: string;
  status: AppointmentStatus;
  modality: AppointmentModality;
  notes: string | null;
  queueTicketId: string | null;
  teleSessionId: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface CreateAppointmentInput {
  patientId: string;
  polyclinic: string;
  practitioner?: string | null;
  scheduledAt: string;
  modality?: AppointmentModality;
  notes?: string | null;
  createdBy?: string | null;
}

const g = globalThis as unknown as { __abeccaAppointments?: Appointment[] };
const mem = g.__abeccaAppointments ?? (g.__abeccaAppointments = []);

type Row = {
  id: string; company_id: string; patient_id: string; polyclinic: string;
  practitioner: string | null; scheduled_at: string; status: AppointmentStatus;
  modality: AppointmentModality | null; notes: string | null; queue_ticket_id: string | null;
  tele_session_id: string | null; created_by: string | null; created_at: string;
};
const toAppt = (r: Row): Appointment => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, polyclinic: r.polyclinic,
  practitioner: r.practitioner, scheduledAt: r.scheduled_at, status: r.status,
  modality: r.modality ?? "in_person", notes: r.notes, queueTicketId: r.queue_ticket_id,
  teleSessionId: r.tele_session_id, createdBy: r.created_by, createdAt: r.created_at,
});

export async function createAppointment(
  companyId: string,
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("appointments")
      .insert({
        company_id: companyId,
        patient_id: input.patientId,
        polyclinic: input.polyclinic,
        practitioner: input.practitioner ?? null,
        scheduled_at: input.scheduledAt,
        status: "scheduled",
        modality: input.modality ?? "in_person",
        notes: input.notes ?? null,
        created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create appointment failed");
    return toAppt(data as Row);
  }
  const appt: Appointment = {
    id: crypto.randomUUID(),
    companyId,
    patientId: input.patientId,
    polyclinic: input.polyclinic,
    practitioner: input.practitioner ?? null,
    scheduledAt: input.scheduledAt,
    status: "scheduled",
    modality: input.modality ?? "in_person",
    notes: input.notes ?? null,
    queueTicketId: null,
    teleSessionId: null,
    createdBy: input.createdBy ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(appt);
  return appt;
}

/** Link a created telemedicine session back onto its appointment. */
export async function setAppointmentTeleSession(
  companyId: string,
  id: string,
  teleSessionId: string,
): Promise<Appointment | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("appointments")
      .update({ tele_session_id: teleSessionId })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toAppt(data as Row) : undefined;
  }
  const a = mem.find((x) => x.companyId === companyId && x.id === id);
  if (!a) return undefined;
  a.teleSessionId = teleSessionId;
  return a;
}

/** Appointments sorted by slot time ascending. */
export async function listAppointments(companyId: string): Promise<Appointment[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("appointments")
      .select("*")
      .eq("company_id", companyId)
      .order("scheduled_at", { ascending: true });
    return (data ?? []).map((r) => toAppt(r as Row));
  }
  return mem
    .filter((a) => a.companyId === companyId)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export async function getAppointment(
  companyId: string,
  id: string,
): Promise<Appointment | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("appointments")
      .select("*")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();
    return data ? toAppt(data as Row) : undefined;
  }
  return mem.find((a) => a.companyId === companyId && a.id === id);
}

export async function setAppointmentStatus(
  companyId: string,
  id: string,
  status: AppointmentStatus,
  queueTicketId?: string | null,
): Promise<Appointment | undefined> {
  const sb = getSupabase();
  if (sb) {
    const patch: Record<string, unknown> = { status };
    if (queueTicketId !== undefined) patch.queue_ticket_id = queueTicketId;
    const { data } = await sb
      .from("appointments")
      .update(patch)
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toAppt(data as Row) : undefined;
  }
  const a = mem.find((x) => x.companyId === companyId && x.id === id);
  if (!a) return undefined;
  a.status = status;
  if (queueTicketId !== undefined) a.queueTicketId = queueTicketId;
  return a;
}

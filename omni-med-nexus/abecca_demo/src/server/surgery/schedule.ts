/**
 * Operating-theatre scheduling (penjadwalan kamar operasi). Each booking reserves
 * a procedure for a patient with a surgeon, theatre (OK room) and time slot, and
 * runs scheduled → in_progress → done / cancelled. Tenant-scoped by company_id;
 * env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";

export type SurgeryStatus = "scheduled" | "in_progress" | "done" | "cancelled";
export const SURGERY_STATUSES: SurgeryStatus[] = ["scheduled", "in_progress", "done", "cancelled"];

export interface SurgeryBooking {
  id: string;
  companyId: string;
  patientId: string;
  procedure: string;
  surgeon: string;
  theatre: string;
  scheduledAt: string;
  status: SurgeryStatus;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface CreateBookingInput {
  patientId: string;
  procedure: string;
  surgeon: string;
  theatre: string;
  scheduledAt: string;
  notes?: string | null;
  createdBy?: string | null;
}

const g = globalThis as unknown as { __abeccaSurgery?: SurgeryBooking[] };
const mem = g.__abeccaSurgery ?? (g.__abeccaSurgery = []);

type Row = {
  id: string; company_id: string; patient_id: string; procedure: string;
  surgeon: string; theatre: string; scheduled_at: string; status: SurgeryStatus;
  notes: string | null; created_by: string | null; created_at: string;
};
const toBooking = (r: Row): SurgeryBooking => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, procedure: r.procedure,
  surgeon: r.surgeon, theatre: r.theatre, scheduledAt: r.scheduled_at, status: r.status,
  notes: r.notes, createdBy: r.created_by, createdAt: r.created_at,
});

export async function createBooking(
  companyId: string,
  input: CreateBookingInput,
): Promise<SurgeryBooking> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("surgery_bookings")
      .insert({
        company_id: companyId,
        patient_id: input.patientId,
        procedure: input.procedure,
        surgeon: input.surgeon,
        theatre: input.theatre,
        scheduled_at: input.scheduledAt,
        status: "scheduled",
        notes: input.notes ?? null,
        created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create booking failed");
    return toBooking(data as Row);
  }
  const booking: SurgeryBooking = {
    id: crypto.randomUUID(),
    companyId,
    patientId: input.patientId,
    procedure: input.procedure,
    surgeon: input.surgeon,
    theatre: input.theatre,
    scheduledAt: input.scheduledAt,
    status: "scheduled",
    notes: input.notes ?? null,
    createdBy: input.createdBy ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(booking);
  return booking;
}

/** Bookings sorted by slot time ascending. */
export async function listBookings(companyId: string): Promise<SurgeryBooking[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("surgery_bookings")
      .select("*")
      .eq("company_id", companyId)
      .order("scheduled_at", { ascending: true });
    return (data ?? []).map((r) => toBooking(r as Row));
  }
  return mem
    .filter((b) => b.companyId === companyId)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export async function setBookingStatus(
  companyId: string,
  id: string,
  status: SurgeryStatus,
): Promise<SurgeryBooking | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("surgery_bookings")
      .update({ status })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toBooking(data as Row) : undefined;
  }
  const b = mem.find((x) => x.companyId === companyId && x.id === id);
  if (!b) return undefined;
  b.status = status;
  return b;
}

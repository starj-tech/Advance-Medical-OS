/**
 * BPJS Antrean Online (Antrol) bookings — one per queue ticket registered to
 * BPJS. Tenant-scoped; env-gated (Supabase or in-memory). The push itself
 * happens in server/bpjs/client (mock or live); this persists the resolved
 * booking code so the registration board can show it and avoid double-booking.
 */
import { getSupabase } from "../supabase";

export interface AntrolBooking {
  id: string;
  companyId: string;
  ticketId: string;
  patientId: string;
  noKartu: string;
  kodeBooking: string;
  poli: string;
  isMock: boolean;
  createdBy: string | null;
  createdAt: string;
}

const g = globalThis as unknown as { __abeccaAntrol?: AntrolBooking[] };
const mem = g.__abeccaAntrol ?? (g.__abeccaAntrol = []);

type Row = {
  id: string; company_id: string; ticket_id: string; patient_id: string;
  no_kartu: string; kode_booking: string; poli: string; is_mock: boolean;
  created_by: string | null; created_at: string;
};
const toBooking = (r: Row): AntrolBooking => ({
  id: r.id, companyId: r.company_id, ticketId: r.ticket_id, patientId: r.patient_id,
  noKartu: r.no_kartu, kodeBooking: r.kode_booking, poli: r.poli, isMock: r.is_mock,
  createdBy: r.created_by, createdAt: r.created_at,
});

export async function getAntrolForTicket(
  companyId: string,
  ticketId: string,
): Promise<AntrolBooking | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("antrol_bookings")
      .select("*")
      .eq("company_id", companyId)
      .eq("ticket_id", ticketId)
      .maybeSingle();
    return data ? toBooking(data as Row) : undefined;
  }
  return mem.find((b) => b.companyId === companyId && b.ticketId === ticketId);
}

/** All bookings for the company, newest first (the board filters by date itself). */
export async function listAntrol(companyId: string): Promise<AntrolBooking[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("antrol_bookings")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => toBooking(r as Row));
  }
  return mem
    .filter((b) => b.companyId === companyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveAntrol(
  companyId: string,
  ticketId: string,
  patientId: string,
  input: { noKartu: string; kodeBooking: string; poli: string; isMock?: boolean; createdBy?: string | null },
): Promise<AntrolBooking> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("antrol_bookings")
      .insert({
        company_id: companyId, ticket_id: ticketId, patient_id: patientId,
        no_kartu: input.noKartu, kode_booking: input.kodeBooking, poli: input.poli,
        is_mock: input.isMock ?? false, created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "save antrol failed");
    return toBooking(data as Row);
  }
  const rec: AntrolBooking = {
    id: crypto.randomUUID(), companyId, ticketId, patientId,
    noKartu: input.noKartu, kodeBooking: input.kodeBooking, poli: input.poli,
    isMock: input.isMock ?? false, createdBy: input.createdBy ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(rec);
  return rec;
}

/**
 * Telemedicine video-visit sessions. Tenant-scoped by company_id; env-gated
 * (Supabase or in-memory). The video room is hosted by an external provider:
 * if TELEMEDICINE_BASE_URL is set the hospital's own room base is used,
 * otherwise we fall back to a public Jitsi Meet room (a real, account-free
 * service) so the join link genuinely works in preview/demo. The room id is
 * generated once at creation and stored alongside the resolved URL.
 */
import { getSupabase } from "../supabase";
import { canTransition, type TeleStatus } from "@/lib/telemedicine";

export interface TeleSession {
  id: string;
  companyId: string;
  patientId: string;
  encounterId: string | null;
  scheduledAt: string;
  status: TeleStatus;
  roomId: string;
  roomUrl: string;
  clinicianId: string | null;
  note: string | null;
  createdAt: string;
}

const g = globalThis as unknown as { __abeccaTele?: TeleSession[] };
const mem = g.__abeccaTele ?? (g.__abeccaTele = []);

type Row = {
  id: string; company_id: string; patient_id: string; encounter_id: string | null;
  scheduled_at: string; status: TeleStatus; room_id: string; room_url: string;
  clinician_id: string | null; note: string | null; created_at: string;
};
const toSession = (r: Row): TeleSession => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, encounterId: r.encounter_id,
  scheduledAt: r.scheduled_at, status: r.status, roomId: r.room_id, roomUrl: r.room_url,
  clinicianId: r.clinician_id, note: r.note, createdAt: r.created_at,
});

/** Resolve the join URL for a room id from the configured provider (or Jitsi). */
export function roomUrlFor(roomId: string): string {
  const base = process.env.TELEMEDICINE_BASE_URL?.replace(/\/+$/, "");
  return base ? `${base}/${roomId}` : `https://meet.jit.si/${roomId}`;
}

export async function createTeleSession(
  companyId: string,
  input: {
    patientId: string;
    encounterId?: string | null;
    scheduledAt: string;
    clinicianId?: string | null;
    note?: string | null;
  },
): Promise<TeleSession> {
  const roomId = `Abecca-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const roomUrl = roomUrlFor(roomId);
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("tele_sessions")
      .insert({
        company_id: companyId,
        patient_id: input.patientId,
        encounter_id: input.encounterId ?? null,
        scheduled_at: input.scheduledAt,
        status: "scheduled",
        room_id: roomId,
        room_url: roomUrl,
        clinician_id: input.clinicianId ?? null,
        note: input.note ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create tele session failed");
    return toSession(data as Row);
  }
  const session: TeleSession = {
    id: crypto.randomUUID(),
    companyId,
    patientId: input.patientId,
    encounterId: input.encounterId ?? null,
    scheduledAt: input.scheduledAt,
    status: "scheduled",
    roomId,
    roomUrl,
    clinicianId: input.clinicianId ?? null,
    note: input.note ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(session);
  return session;
}

export async function listTeleSessions(
  companyId: string,
  opts?: { status?: TeleStatus },
): Promise<TeleSession[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("tele_sessions").select("*").eq("company_id", companyId);
    if (opts?.status) q = q.eq("status", opts.status);
    const { data } = await q.order("scheduled_at", { ascending: true });
    return (data ?? []).map((r) => toSession(r as Row));
  }
  return mem
    .filter((s) => s.companyId === companyId && (!opts?.status || s.status === opts.status))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export async function getTeleSession(
  companyId: string,
  id: string,
): Promise<TeleSession | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("tele_sessions").select("*").eq("company_id", companyId).eq("id", id).maybeSingle();
    return data ? toSession(data as Row) : undefined;
  }
  return mem.find((s) => s.companyId === companyId && s.id === id);
}

/** Advance the session status, enforcing the legal transition map. */
export async function setTeleStatus(
  companyId: string,
  id: string,
  status: TeleStatus,
): Promise<TeleSession | { error: string } | undefined> {
  const existing = await getTeleSession(companyId, id);
  if (!existing) return undefined;
  if (existing.status === status) return existing;
  if (!canTransition(existing.status, status)) {
    return { error: `Transisi ${existing.status} → ${status} tidak diizinkan` };
  }
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("tele_sessions")
      .update({ status })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toSession(data as Row) : undefined;
  }
  existing.status = status;
  return existing;
}

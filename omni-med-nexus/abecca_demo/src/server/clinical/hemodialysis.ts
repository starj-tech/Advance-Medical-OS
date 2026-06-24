/**
 * Hemodialysis unit — machine master + session schedule. Tenant-scoped by
 * company_id; env-gated (Supabase or in-memory). The schedule is slot-based
 * (date × shift × machine): one patient per machine per shift, so the API can
 * reject double-bookings via findHdConflict before scheduling.
 */
import { getSupabase } from "../supabase";

export type HdMachineStatus = "active" | "maintenance";
export type HdShift = "pagi" | "siang" | "sore";
export type HdSessionStatus = "scheduled" | "completed" | "cancelled";

export const HD_SHIFTS: HdShift[] = ["pagi", "siang", "sore"];
export const isHdShift = (s: unknown): s is HdShift =>
  typeof s === "string" && (HD_SHIFTS as string[]).includes(s);

export interface HdMachine {
  id: string;
  companyId: string;
  name: string;
  status: HdMachineStatus;
  createdAt: string;
}

export interface HdSession {
  id: string;
  companyId: string;
  patientId: string;
  machineId: string;
  machineName: string;
  /** Calendar date YYYY-MM-DD. */
  date: string;
  shift: HdShift;
  durationHours: number;
  status: HdSessionStatus;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

const g = globalThis as unknown as {
  __abeccaHdMachines?: HdMachine[];
  __abeccaHdSessions?: HdSession[];
};
const memMachines = g.__abeccaHdMachines ?? (g.__abeccaHdMachines = []);
const memSessions = g.__abeccaHdSessions ?? (g.__abeccaHdSessions = []);

type MachineRow = {
  id: string; company_id: string; name: string; status: HdMachineStatus; created_at: string;
};
const toMachine = (r: MachineRow): HdMachine => ({
  id: r.id, companyId: r.company_id, name: r.name, status: r.status, createdAt: r.created_at,
});

type SessionRow = {
  id: string; company_id: string; patient_id: string; machine_id: string; machine_name: string;
  date: string; shift: HdShift; duration_hours: number; status: HdSessionStatus;
  note: string | null; created_by: string | null; created_at: string;
};
const toSession = (r: SessionRow): HdSession => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, machineId: r.machine_id,
  machineName: r.machine_name, date: r.date, shift: r.shift,
  durationHours: Number(r.duration_hours), status: r.status, note: r.note,
  createdBy: r.created_by, createdAt: r.created_at,
});

export async function createHdMachine(companyId: string, name: string): Promise<HdMachine> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("hd_machines")
      .insert({ company_id: companyId, name, status: "active" })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create hd machine failed");
    return toMachine(data as MachineRow);
  }
  const machine: HdMachine = {
    id: crypto.randomUUID(),
    companyId,
    name,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  memMachines.push(machine);
  return machine;
}

export async function listHdMachines(companyId: string): Promise<HdMachine[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("hd_machines")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    return (data ?? []).map((r) => toMachine(r as MachineRow));
  }
  return memMachines
    .filter((m) => m.companyId === companyId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getHdMachine(
  companyId: string,
  id: string,
): Promise<HdMachine | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("hd_machines").select("*").eq("company_id", companyId).eq("id", id).maybeSingle();
    return data ? toMachine(data as MachineRow) : undefined;
  }
  return memMachines.find((m) => m.companyId === companyId && m.id === id);
}

export async function setHdMachineStatus(
  companyId: string,
  id: string,
  status: HdMachineStatus,
): Promise<HdMachine | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("hd_machines")
      .update({ status })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toMachine(data as MachineRow) : undefined;
  }
  const m = memMachines.find((x) => x.companyId === companyId && x.id === id);
  if (!m) return undefined;
  m.status = status;
  return m;
}

/** A machine can serve one (non-cancelled) patient per date+shift slot. */
export async function findHdConflict(
  companyId: string,
  machineId: string,
  date: string,
  shift: HdShift,
): Promise<HdSession | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("hd_sessions")
      .select("*")
      .eq("company_id", companyId)
      .eq("machine_id", machineId)
      .eq("date", date)
      .eq("shift", shift)
      .neq("status", "cancelled")
      .limit(1);
    return data?.length ? toSession(data[0] as SessionRow) : undefined;
  }
  return memSessions.find(
    (s) =>
      s.companyId === companyId &&
      s.machineId === machineId &&
      s.date === date &&
      s.shift === shift &&
      s.status !== "cancelled",
  );
}

export async function scheduleHdSession(
  companyId: string,
  input: {
    patientId: string;
    machineId: string;
    machineName: string;
    date: string;
    shift: HdShift;
    durationHours?: number;
    note?: string | null;
    createdBy?: string | null;
  },
): Promise<HdSession> {
  const durationHours = input.durationHours && input.durationHours > 0 ? input.durationHours : 4;
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("hd_sessions")
      .insert({
        company_id: companyId,
        patient_id: input.patientId,
        machine_id: input.machineId,
        machine_name: input.machineName,
        date: input.date,
        shift: input.shift,
        duration_hours: durationHours,
        status: "scheduled",
        note: input.note ?? null,
        created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "schedule hd session failed");
    return toSession(data as SessionRow);
  }
  const session: HdSession = {
    id: crypto.randomUUID(),
    companyId,
    patientId: input.patientId,
    machineId: input.machineId,
    machineName: input.machineName,
    date: input.date,
    shift: input.shift,
    durationHours,
    status: "scheduled",
    note: input.note ?? null,
    createdBy: input.createdBy ?? null,
    createdAt: new Date().toISOString(),
  };
  memSessions.push(session);
  return session;
}

const SHIFT_ORDER: Record<HdShift, number> = { pagi: 0, siang: 1, sore: 2 };

export async function listHdSessions(
  companyId: string,
  opts?: { date?: string },
): Promise<HdSession[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("hd_sessions").select("*").eq("company_id", companyId);
    if (opts?.date) q = q.eq("date", opts.date);
    const { data } = await q.order("date", { ascending: true });
    return (data ?? [])
      .map((r) => toSession(r as SessionRow))
      .sort((a, b) => a.date.localeCompare(b.date) || SHIFT_ORDER[a.shift] - SHIFT_ORDER[b.shift]);
  }
  return memSessions
    .filter((s) => s.companyId === companyId && (!opts?.date || s.date === opts.date))
    .sort((a, b) => a.date.localeCompare(b.date) || SHIFT_ORDER[a.shift] - SHIFT_ORDER[b.shift]);
}

export async function setHdSessionStatus(
  companyId: string,
  id: string,
  status: HdSessionStatus,
): Promise<HdSession | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("hd_sessions")
      .update({ status })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toSession(data as SessionRow) : undefined;
  }
  const s = memSessions.find((x) => x.companyId === companyId && x.id === id);
  if (!s) return undefined;
  s.status = status;
  return s;
}

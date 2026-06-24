/**
 * Shift roster (penjadwalan jaga — Domain J/WS18). Tenant-scoped shift assignments
 * (staff × shift type × date × unit), with a double-booking guard (one shift per
 * person per day) and a workload roll-up (hours per staff over a period, lib/rostering).
 * Builds on the staff directory. Env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";
import { conflictsWith, shiftHours, type ShiftType } from "@/lib/rostering";

export interface ShiftAssignment {
  id: string;
  companyId: string;
  staffName: string;
  unit: string;
  shiftType: ShiftType;
  date: string; // YYYY-MM-DD
  notes: string | null;
  createdAt: string;
}

type Row = {
  id: string; company_id: string; staff_name: string; unit: string; shift_type: string;
  shift_date: string; notes: string | null; created_at: string;
};
const toShift = (r: Row): ShiftAssignment => ({
  id: r.id, companyId: r.company_id, staffName: r.staff_name, unit: r.unit,
  shiftType: r.shift_type as ShiftType, date: r.shift_date, notes: r.notes, createdAt: r.created_at,
});

const g = globalThis as unknown as { __abeccaShifts?: ShiftAssignment[] };
const mem = g.__abeccaShifts ?? (g.__abeccaShifts = []);

export type CreateShiftResult = { ok: true; shift: ShiftAssignment } | { ok: false; reason: "conflict" };

export async function createShift(
  companyId: string,
  input: { staffName: string; unit: string; shiftType: ShiftType; date: string; notes?: string | null },
): Promise<CreateShiftResult> {
  // Reject a second shift for the same person on the same day (uses the same day's roster).
  const sameDay = await listShifts(companyId, { from: input.date, to: input.date });
  if (conflictsWith(sameDay, { staffName: input.staffName, date: input.date })) {
    return { ok: false, reason: "conflict" };
  }
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("shift_assignments")
      .insert({ company_id: companyId, staff_name: input.staffName, unit: input.unit, shift_type: input.shiftType, shift_date: input.date, notes: input.notes ?? null })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "create shift failed");
    return { ok: true, shift: toShift(data as Row) };
  }
  const shift: ShiftAssignment = {
    id: crypto.randomUUID(), companyId, staffName: input.staffName, unit: input.unit,
    shiftType: input.shiftType, date: input.date, notes: input.notes ?? null, createdAt: new Date().toISOString(),
  };
  mem.push(shift);
  return { ok: true, shift };
}

export async function listShifts(
  companyId: string,
  opts: { from?: string; to?: string; unit?: string } = {},
): Promise<ShiftAssignment[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("shift_assignments").select("*").eq("company_id", companyId);
    if (opts.from) q = q.gte("shift_date", opts.from);
    if (opts.to) q = q.lte("shift_date", opts.to);
    if (opts.unit) q = q.eq("unit", opts.unit);
    const { data } = await q.order("shift_date").order("shift_type");
    return (data ?? []).map((r) => toShift(r as Row));
  }
  return mem
    .filter((s) => s.companyId === companyId
      && (!opts.from || s.date >= opts.from)
      && (!opts.to || s.date <= opts.to)
      && (!opts.unit || s.unit === opts.unit))
    .sort((a, b) => a.date.localeCompare(b.date) || a.shiftType.localeCompare(b.shiftType) || a.staffName.localeCompare(b.staffName));
}

export async function deleteShift(companyId: string, id: string): Promise<boolean> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("shift_assignments").delete().eq("company_id", companyId).eq("id", id).select("id").maybeSingle();
    return !!data;
  }
  const i = mem.findIndex((s) => s.companyId === companyId && s.id === id);
  if (i < 0) return false;
  mem.splice(i, 1);
  return true;
}

export interface StaffLoad { staffName: string; shifts: number; hours: number }
export interface RosterSummary {
  total: number;
  byType: Record<ShiftType, number>;
  /** Workload (beban kerja) per staff over the period, busiest first. */
  byStaff: StaffLoad[];
}

export async function rosterSummary(companyId: string, opts: { from: string; to: string }): Promise<RosterSummary> {
  const shifts = await listShifts(companyId, opts);
  const byType: Record<ShiftType, number> = { morning: 0, afternoon: 0, night: 0, on_call: 0 };
  const loadByStaff = new Map<string, StaffLoad>();
  for (const s of shifts) {
    byType[s.shiftType] += 1;
    const cur = loadByStaff.get(s.staffName) ?? { staffName: s.staffName, shifts: 0, hours: 0 };
    cur.shifts += 1;
    cur.hours += shiftHours(s.shiftType);
    loadByStaff.set(s.staffName, cur);
  }
  const byStaff = [...loadByStaff.values()].sort((a, b) => b.hours - a.hours || a.staffName.localeCompare(b.staffName));
  return { total: shifts.length, byType, byStaff };
}

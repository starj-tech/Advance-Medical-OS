/**
 * Shift rostering model (penjadwalan jaga — Domain J/WS18). Client-safe & pure so the
 * roster form, the board, and the server agree. A shift assigns a staff member to a
 * shift type on a date in a unit; each shift type carries a workload (hours) so the
 * board can surface per-staff load, and a conflict check prevents double-booking the
 * same person on the same day. No imports.
 */
export type ShiftType = "morning" | "afternoon" | "night" | "on_call";
export const SHIFT_TYPES: ShiftType[] = ["morning", "afternoon", "night", "on_call"];
export const SHIFT_TYPE_LABEL: Record<ShiftType, string> = {
  morning: "Pagi", afternoon: "Siang", night: "Malam", on_call: "On-call",
};
export const SHIFT_TYPE_TIME: Record<ShiftType, string> = {
  morning: "07:00–14:00", afternoon: "14:00–21:00", night: "21:00–07:00", on_call: "Siaga 24 jam",
};
export const SHIFT_TYPE_VARIANT: Record<ShiftType, "info" | "warning" | "danger" | "muted"> = {
  morning: "info", afternoon: "warning", night: "danger", on_call: "muted",
};
/** Scheduled hours per shift type — drives the workload (beban kerja) roll-up. */
export const SHIFT_HOURS: Record<ShiftType, number> = { morning: 7, afternoon: 7, night: 10, on_call: 24 };

export function shiftHours(type: ShiftType): number {
  return SHIFT_HOURS[type];
}

/** Total scheduled hours across a set of shift types. */
export function totalHours(types: ShiftType[]): number {
  return types.reduce((sum, t) => sum + SHIFT_HOURS[t], 0);
}

/** Double-booking guard: is the candidate the same staff on the same date as an existing shift? */
export function conflictsWith(
  existing: Array<{ staffName: string; date: string }>,
  candidate: { staffName: string; date: string },
): boolean {
  return existing.some((e) => e.staffName === candidate.staffName && e.date === candidate.date);
}

export const isShiftType = (v: unknown): v is ShiftType =>
  typeof v === "string" && (SHIFT_TYPES as string[]).includes(v);

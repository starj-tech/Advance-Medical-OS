import { describe, it, expect } from "vitest";
import { shiftHours, totalHours, conflictsWith, isShiftType, SHIFT_HOURS } from "@/lib/rostering";
import { createShift, listShifts, deleteShift, rosterSummary } from "@/server/hr/rostering";

describe("rostering: hours & conflict (pure)", () => {
  it("reports hours per shift type and totals", () => {
    expect(SHIFT_HOURS).toEqual({ morning: 7, afternoon: 7, night: 10, on_call: 24 });
    expect(shiftHours("night")).toBe(10);
    expect(totalHours(["morning", "night", "on_call"])).toBe(41);
    expect(totalHours([])).toBe(0);
  });
  it("detects same-staff same-day conflicts", () => {
    const existing = [{ staffName: "Ns. Dewi", date: "2026-06-20" }];
    expect(conflictsWith(existing, { staffName: "Ns. Dewi", date: "2026-06-20" })).toBe(true);
    expect(conflictsWith(existing, { staffName: "Ns. Dewi", date: "2026-06-21" })).toBe(false);
    expect(conflictsWith(existing, { staffName: "Ns. Budi", date: "2026-06-20" })).toBe(false);
    expect(isShiftType("on_call")).toBe(true);
    expect(isShiftType("graveyard")).toBe(false);
  });
});

describe("rostering: roster store + workload (in-memory)", () => {
  const A = "roster-test-A";
  const B = "roster-test-B";
  let delId = "";

  it("creates shifts and rejects double-booking the same person on a day", async () => {
    const r1 = await createShift(A, { staffName: "Ns. Dewi", unit: "ICU", shiftType: "morning", date: "2026-06-20" });
    expect(r1.ok).toBe(true);
    if (r1.ok) delId = r1.shift.id;
    const dup = await createShift(A, { staffName: "Ns. Dewi", unit: "ICU", shiftType: "night", date: "2026-06-20" });
    expect(dup.ok).toBe(false);
    // Different day is fine.
    expect((await createShift(A, { staffName: "Ns. Dewi", unit: "ICU", shiftType: "night", date: "2026-06-21" })).ok).toBe(true);
    // Different person same day is fine.
    expect((await createShift(A, { staffName: "dr. Budi", unit: "IGD", shiftType: "on_call", date: "2026-06-20" })).ok).toBe(true);
  });

  it("lists by date range and rolls up workload hours per staff", async () => {
    const week = await listShifts(A, { from: "2026-06-20", to: "2026-06-26" });
    expect(week.length).toBe(3);
    const sum = await rosterSummary(A, { from: "2026-06-20", to: "2026-06-26" });
    expect(sum.total).toBe(3);
    expect(sum.byType).toEqual({ morning: 1, afternoon: 0, night: 1, on_call: 1 });
    // dr. Budi on-call (24h) outranks Ns. Dewi (7 + 10 = 17h).
    expect(sum.byStaff[0]).toEqual({ staffName: "dr. Budi", shifts: 1, hours: 24 });
    expect(sum.byStaff[1]).toEqual({ staffName: "Ns. Dewi", shifts: 2, hours: 17 });
  });

  it("respects the date window and deletes", async () => {
    expect((await listShifts(A, { from: "2026-06-21", to: "2026-06-21" })).length).toBe(1); // only Dewi's night
    expect(await deleteShift(A, delId)).toBe(true);
    expect(await deleteShift(A, delId)).toBe(false); // already gone
  });

  it("is tenant-isolated", async () => {
    expect((await listShifts(B, { from: "2026-06-20", to: "2026-06-26" })).length).toBe(0);
    expect(await deleteShift(B, "anything")).toBe(false);
    expect((await rosterSummary(B, { from: "2026-06-20", to: "2026-06-26" })).total).toBe(0);
  });
});

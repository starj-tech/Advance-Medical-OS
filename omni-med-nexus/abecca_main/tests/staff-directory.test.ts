import { describe, it, expect } from "vitest";
import { staffMatchesQuery, isStaffProfession, isStaffStatus, STAFF_PROFESSION_LABEL } from "@/lib/staff-directory";
import { createStaff, listStaff, updateStaff, staffSummary } from "@/server/hr/staff-directory";

describe("staff-directory: matcher & validators (pure)", () => {
  it("matches case-insensitively across fields, empty query matches all", () => {
    expect(staffMatchesQuery("", ["anything"])).toBe(true);
    expect(staffMatchesQuery("igd", ["dr. Sari", "IGD", null])).toBe(true);
    expect(staffMatchesQuery("SARI", ["dr. Sari", "Poli"])).toBe(true);
    expect(staffMatchesQuery("xyz", ["dr. Sari", "IGD"])).toBe(false);
    expect(staffMatchesQuery("budi", [null, undefined, ""])).toBe(false);
  });

  it("validates profession & status", () => {
    expect(isStaffProfession("nurse")).toBe(true);
    expect(isStaffProfession("astronaut")).toBe(false);
    expect(isStaffStatus("on_leave")).toBe(true);
    expect(isStaffStatus("vacation")).toBe(false);
    expect(STAFF_PROFESSION_LABEL.pharmacist).toBe("Apoteker");
  });
});

describe("staff-directory: store + filters + summary (in-memory)", () => {
  const A = "staff-test-A";
  const B = "staff-test-B";
  let nurseId = "";

  it("creates members (default active) sorted by name", async () => {
    const n = await createStaff(A, { name: "Siti Perawat", profession: "nurse", unit: "IGD" });
    await createStaff(A, { name: "Andi Apoteker", profession: "pharmacist", unit: "Farmasi", status: "on_leave" });
    await createStaff(A, { name: "Budi Dokter", profession: "doctor", unit: "Poli Umum" });
    nurseId = n.id;
    expect(n.status).toBe("active");
    const list = await listStaff(A);
    expect(list.map((s) => s.name)).toEqual(["Andi Apoteker", "Budi Dokter", "Siti Perawat"]);
  });

  it("filters by profession, status, and free-text query", async () => {
    expect((await listStaff(A, { profession: "doctor" })).map((s) => s.name)).toEqual(["Budi Dokter"]);
    expect((await listStaff(A, { status: "on_leave" })).map((s) => s.name)).toEqual(["Andi Apoteker"]);
    expect((await listStaff(A, { query: "igd" })).map((s) => s.name)).toEqual(["Siti Perawat"]);
    expect((await listStaff(A, { query: "farmasi" })).map((s) => s.name)).toEqual(["Andi Apoteker"]);
  });

  it("updates status & contact", async () => {
    const u = await updateStaff(A, nurseId, { status: "inactive", phone: "0812-000" });
    expect(u!.status).toBe("inactive");
    expect(u!.phone).toBe("0812-000");
  });

  it("summarizes counts by status", async () => {
    const sum = await staffSummary(A);
    expect(sum.total).toBe(3);
    expect(sum.byStatus).toEqual({ active: 1, on_leave: 1, inactive: 1 });
  });

  it("rejects unknown ids and is tenant-isolated", async () => {
    expect(await updateStaff(A, "nope", { status: "active" })).toBeUndefined();
    expect((await listStaff(B)).length).toBe(0);
    expect(await updateStaff(B, nurseId, { status: "active" })).toBeUndefined();
    expect((await staffSummary(B)).total).toBe(0);
  });
});

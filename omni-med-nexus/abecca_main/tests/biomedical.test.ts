import { describe, it, expect } from "vitest";
import { calibrationState, daysUntilDue, isAssetStatus, isAssetCategory } from "@/lib/biomedical";
import { createAsset, listAssets, updateAsset, assetSummary } from "@/server/biomedical/assets";

const now = new Date("2026-06-20T00:00:00.000Z");

describe("biomedical: calibration state (pure)", () => {
  it("derives ok / due_soon / overdue from the next-due date, null when unscheduled", () => {
    expect(calibrationState(null, now)).toBeNull();
    expect(calibrationState("2026-06-10", now)).toBe("overdue");  // past
    expect(calibrationState("2026-07-10", now)).toBe("due_soon");  // 20 days
    expect(calibrationState("2026-09-30", now)).toBe("ok");        // >30 days
    expect(calibrationState("2026-07-20", now)).toBe("due_soon");  // exactly 30 days
  });
  it("computes days until due and validates enums", () => {
    expect(daysUntilDue("2026-06-25", now)).toBe(5);
    expect(daysUntilDue("2026-06-10", now)).toBe(-10);
    expect(daysUntilDue(null, now)).toBeNull();
    expect(isAssetStatus("operational")).toBe(true);
    expect(isAssetStatus("on")).toBe(false);
    expect(isAssetCategory("life_support")).toBe(true);
    expect(isAssetCategory("furniture")).toBe(false);
  });
});

describe("biomedical: asset register + summary (in-memory)", () => {
  const A = "asset-test-A";
  const B = "asset-test-B";
  let ventId = "";

  it("creates (default operational) and sorts soonest-due first, unscheduled last", async () => {
    const vent = await createAsset(A, { name: "Ventilator ICU-1", category: "life_support", location: "ICU", nextDue: "2026-06-10" }); // overdue
    await createAsset(A, { name: "Monitor IGD-2", category: "monitoring", location: "IGD", nextDue: "2026-07-10" }); // due_soon
    await createAsset(A, { name: "Infus Pump-9", category: "other", location: "Bangsal", status: "broken" }); // no schedule
    ventId = vent.id;
    expect(vent.status).toBe("operational");
    const list = await listAssets(A);
    expect(list.map((a) => a.name)).toEqual(["Ventilator ICU-1", "Monitor IGD-2", "Infus Pump-9"]);
  });

  it("filters by status and category", async () => {
    expect((await listAssets(A, { status: "broken" })).map((a) => a.name)).toEqual(["Infus Pump-9"]);
    expect((await listAssets(A, { category: "life_support" })).map((a) => a.name)).toEqual(["Ventilator ICU-1"]);
  });

  it("summarises status + calibration compliance (scheduled only)", async () => {
    const sum = await assetSummary(A, now);
    expect(sum.total).toBe(3);
    expect(sum.byStatus.operational).toBe(2);
    expect(sum.byStatus.broken).toBe(1);
    expect(sum.calibration).toEqual({ ok: 0, due_soon: 1, overdue: 1 }); // Infus Pump unscheduled → excluded
  });

  it("updates status & reschedules calibration", async () => {
    const done = await updateAsset(A, ventId, { status: "maintenance", nextDue: "2026-12-01", lastMaintenance: "2026-06-20" });
    expect(done!.status).toBe("maintenance");
    expect(done!.nextDue).toBe("2026-12-01");
    const sum = await assetSummary(A, now);
    expect(sum.calibration.overdue).toBe(0); // rescheduled to the future
    expect(sum.calibration.ok).toBe(1);
  });

  it("rejects unknown ids and is tenant-isolated", async () => {
    expect(await updateAsset(A, "nope", { status: "operational" })).toBeUndefined();
    expect((await listAssets(B)).length).toBe(0);
    expect(await updateAsset(B, ventId, { status: "retired" })).toBeUndefined();
    expect((await assetSummary(B, now)).total).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { locationLabel, stockByLocation, canTransfer, isDistinctLocation, DEFAULT_LOCATION } from "@/lib/stock-transfer";
import { createItem, recordBatch, listBatches, inventoryReport } from "@/server/pharmacy/inventory";
import { transferStock, listTransfers } from "@/server/pharmacy/stock-transfer";

const now = new Date("2026-06-20T00:00:00.000Z");
const FAR = "2027-06-20";

describe("stock-transfer: helpers (pure)", () => {
  it("labels null/blank locations as the main store", () => {
    expect(locationLabel(null)).toBe(DEFAULT_LOCATION);
    expect(locationLabel("  ")).toBe(DEFAULT_LOCATION);
    expect(locationLabel("Depo IGD")).toBe("Depo IGD");
  });
  it("groups stock by location (null → default)", () => {
    expect(stockByLocation([
      { location: null, quantity: 10 },
      { location: "Depo IGD", quantity: 4 },
      { location: null, quantity: 6 },
    ])).toEqual({ [DEFAULT_LOCATION]: 16, "Depo IGD": 4 });
  });
  it("validates a transfer quantity and distinct location", () => {
    expect(canTransfer(10, 4)).toBe(true);
    expect(canTransfer(10, 0)).toBe(false);
    expect(canTransfer(10, 11)).toBe(false);
    expect(canTransfer(10, 2.5)).toBe(false);
    expect(isDistinctLocation(null, "Depo IGD")).toBe(true);
    expect(isDistinctLocation(null, "  ")).toBe(false); // both resolve to default
    expect(isDistinctLocation("Depo A", "Depo A")).toBe(false);
  });
});

describe("stock-transfer: atomic move conserves stock (in-memory)", () => {
  const A = "xfer-test-A";
  const B = "xfer-test-B";
  let itemId = "";
  let srcBatchId = "";

  it("sets up an item with one source batch at the main store", async () => {
    const item = await createItem(A, { name: "Ringer Laktat", unit: "kolf", reorderPoint: 20 });
    itemId = item.id;
    const b = await recordBatch(A, item.id, { batchNo: "RL-01", quantity: 30, expiryDate: FAR });
    srcBatchId = b!.id;
    expect(b!.location).toBeNull(); // main store
  });

  it("transfers quantity to a destination depot, conserving total stock", async () => {
    const before = (await inventoryReport(A, now)).items[0].totalStock;
    const r = await transferStock(A, { fromBatchId: srcBatchId, toLocation: "Depo IGD", quantity: 12 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.transfer.fromLocation).toBe(DEFAULT_LOCATION);
    expect(r.transfer.toLocation).toBe("Depo IGD");
    expect(r.transfer.itemName).toBe("Ringer Laktat");

    const batches = await listBatches(A, itemId);
    const src = batches.find((b) => b.id === srcBatchId)!;
    const dest = batches.find((b) => b.location === "Depo IGD")!;
    expect(src.quantity).toBe(18);   // 30 − 12
    expect(dest.quantity).toBe(12);
    expect(dest.batchNo).toBe("RL-01"); // same lot
    // Total on-hand unchanged: only its location moved.
    expect((await inventoryReport(A, now)).items[0].totalStock).toBe(before);
    expect((await listTransfers(A)).length).toBe(1);
  });

  it("rejects over-draw, same-location, and unknown batches", async () => {
    expect((await transferStock(A, { fromBatchId: srcBatchId, toLocation: "Depo IGD", quantity: 999 })).ok).toBe(false);
    const same = await transferStock(A, { fromBatchId: srcBatchId, toLocation: "Gudang Pusat", quantity: 1 });
    expect(same.ok).toBe(false);
    if (!same.ok) expect(same.reason).toBe("same_location");
    const nf = await transferStock(A, { fromBatchId: "nope", toLocation: "Depo IGD", quantity: 1 });
    expect(nf.ok).toBe(false);
    if (!nf.ok) expect(nf.reason).toBe("not_found");
  });

  it("is tenant-isolated", async () => {
    expect((await transferStock(B, { fromBatchId: srcBatchId, toLocation: "Depo IGD", quantity: 1 })).ok).toBe(false);
    expect((await listTransfers(B)).length).toBe(0);
  });
});

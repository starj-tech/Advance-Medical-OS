import { describe, it, expect } from "vitest";
import { variance, varianceStatus } from "@/lib/stock-take";
import { createItem, recordBatch, inventoryReport } from "@/server/pharmacy/inventory";
import {
  recordStockTake, listStockTakes, applyStockTake, stockTakeSummary,
} from "@/server/pharmacy/stock-take";

const now = new Date("2026-06-18T00:00:00.000Z");
const FUTURE = "2027-12-31";

describe("stock-take: variance (pure)", () => {
  it("signed counted - system", () => {
    expect(variance(10, 7)).toBe(-3);
    expect(variance(7, 10)).toBe(3);
    expect(variance(5, 5)).toBe(0);
  });
  it("clamps a negative count to zero", () => {
    expect(variance(5, -2)).toBe(-5);
  });
  it("varianceStatus maps sign", () => {
    expect(varianceStatus(0)).toBe("match");
    expect(varianceStatus(4)).toBe("surplus");
    expect(varianceStatus(-4)).toBe("shortage");
  });
});

describe("stock-take: register + apply (in-memory)", () => {
  const A = "stocktake-test-A";
  const B = "stocktake-test-B";
  let batchId = "";
  let itemId = "";
  let recId = "";

  it("records a count, snapshotting the system on-hand + variance", async () => {
    const item = await createItem(A, { name: "Paracetamol 500 mg", unit: "tablet", reorderPoint: 10 });
    itemId = item.id;
    const batch = await recordBatch(A, item.id, { batchNo: "LOT-1", quantity: 100, expiryDate: FUTURE });
    batchId = batch!.id;

    const rec = await recordStockTake(A, batchId, { countedQty: 95, note: "rusak 5" });
    expect(rec).toBeDefined();
    recId = rec!.id;
    expect(rec!.systemQty).toBe(100);
    expect(rec!.countedQty).toBe(95);
    expect(rec!.variance).toBe(-5);
    expect(rec!.applied).toBe(false);
    expect(rec!.batchNo).toBe("LOT-1");

    expect(await recordStockTake(A, "nope", { countedQty: 1 })).toBeUndefined();
  });

  it("lists and summarises", async () => {
    expect((await listStockTakes(A)).length).toBe(1);
    expect((await listStockTakes(A, { itemId })).length).toBe(1);
    const sum = await stockTakeSummary(A);
    expect(sum.total).toBe(1);
    expect(sum.applied).toBe(0);
    expect(sum.byStatus.shortage).toBe(1);
  });

  it("applying adjusts the batch on-hand and marks the record", async () => {
    const applied = await applyStockTake(A, recId);
    expect(applied!.applied).toBe(true);
    const rep = await inventoryReport(A, now);
    expect(rep.items.find((x) => x.item.id === itemId)!.totalStock).toBe(95);
    expect((await stockTakeSummary(A)).applied).toBe(1);
  });

  it("is tenant-isolated", async () => {
    expect(await recordStockTake(B, batchId, { countedQty: 1 })).toBeUndefined();
    expect((await listStockTakes(B)).length).toBe(0);
    expect(await applyStockTake(B, recId)).toBeUndefined();
    expect((await stockTakeSummary(B)).total).toBe(0);
  });
});

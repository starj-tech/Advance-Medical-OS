import { describe, it, expect } from "vitest";
import { stockStatus, expiryBucket, daysToExpiry } from "@/lib/inventory";
import {
  createItem, listItems, recordBatch, listBatches, setBatchQuantity, inventoryReport,
} from "@/server/pharmacy/inventory";

const now = new Date("2026-06-18T00:00:00.000Z");
const EXPIRED = "2026-01-01";
const SOON = "2026-07-10"; // ~22 days
const SOON_EDGE = "2026-09-16"; // 90 days
const FAR = "2027-06-18"; // ~365 days

describe("inventory: stockStatus", () => {
  it("out at or below zero", () => {
    expect(stockStatus(0, 5)).toBe("out");
    expect(stockStatus(-2, 5)).toBe("out");
  });
  it("low at/under reorder point", () => {
    expect(stockStatus(5, 5)).toBe("low");
    expect(stockStatus(3, 5)).toBe("low");
  });
  it("ok above reorder point", () => {
    expect(stockStatus(6, 5)).toBe("ok");
    expect(stockStatus(1, 0)).toBe("ok");
  });
});

describe("inventory: expiry buckets", () => {
  it("buckets by window", () => {
    expect(expiryBucket(EXPIRED, now)).toBe("expired");
    expect(expiryBucket(SOON, now)).toBe("expiring_soon");
    expect(expiryBucket(SOON_EDGE, now)).toBe("expiring_soon");
    expect(expiryBucket(FAR, now)).toBe("ok");
  });
  it("daysToExpiry sign & magnitude", () => {
    expect(daysToExpiry(SOON, now)).toBe(22);
    expect(daysToExpiry(EXPIRED, now)).toBeLessThan(0);
  });
});

describe("inventory: store lifecycle + aggregation (in-memory)", () => {
  const A = "inv-test-A";
  const B = "inv-test-B";

  it("creates an item and lists it", async () => {
    const item = await createItem(A, { name: "Paracetamol 500 mg", unit: "tablet", reorderPoint: 10 });
    expect(item.id).toBeTruthy();
    expect(item.reorderPoint).toBe(10);
    const list = await listItems(A);
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(item.id);
  });

  it("receiving batches raises on-hand stock and rolls up alerts", async () => {
    const [item] = await listItems(A);
    const b1 = await recordBatch(A, item.id, { batchNo: "LOT-1", quantity: 5, expiryDate: SOON });
    expect(b1).toBeDefined();
    expect(b1!.itemId).toBe(item.id);

    let rep = await inventoryReport(A, now);
    expect(rep.items.length).toBe(1);
    expect(rep.items[0].totalStock).toBe(5);
    expect(rep.items[0].status).toBe("low");

    await recordBatch(A, item.id, { batchNo: "LOT-2", quantity: 8, expiryDate: FAR });
    rep = await inventoryReport(A, now);
    expect(rep.items[0].totalStock).toBe(13);
    expect(rep.items[0].status).toBe("ok");
    expect((await listBatches(A, item.id)).length).toBe(2);

    const buckets = rep.items[0].batches.map((x) => x.bucket).sort();
    expect(buckets).toContain("expiring_soon");
    expect(buckets).toContain("ok");
    expect(rep.alerts.expiringSoonBatches).toBe(1);
    expect(rep.alerts.expiredBatches).toBe(0);
    expect(rep.alerts.lowStock).toBe(0);
    expect(rep.alerts.outOfStock).toBe(0);
  });

  it("setBatchQuantity adjusts stock and clamps negatives; empty item is out", async () => {
    const [item] = await listItems(A);
    const batches = await listBatches(A, item.id);
    const adj = await setBatchQuantity(A, batches[0].id, 0);
    expect(adj!.quantity).toBe(0);
    const clamp = await setBatchQuantity(A, batches[1].id, -99);
    expect(clamp!.quantity).toBe(0);

    const rep = await inventoryReport(A, now);
    expect(rep.items[0].totalStock).toBe(0);
    expect(rep.items[0].status).toBe("out");
    expect(rep.alerts.outOfStock).toBe(1);
    expect(rep.alerts.expiringSoonBatches).toBe(0); // zero-qty batches not counted
  });

  it("expired batch with stock raises the expired alert", async () => {
    const item2 = await createItem(A, { name: "Amoksisilin sirup", unit: "botol", reorderPoint: 3 });
    await recordBatch(A, item2.id, { batchNo: "LOT-OLD", quantity: 4, expiryDate: EXPIRED });
    const rep = await inventoryReport(A, now);
    const r2 = rep.items.find((x) => x.item.id === item2.id)!;
    expect(r2.totalStock).toBe(4);
    expect(rep.alerts.expiredBatches).toBe(1);
  });

  it("is tenant-isolated", async () => {
    const [item] = await listItems(A);
    expect(await recordBatch(B, item.id, { batchNo: "X", quantity: 1, expiryDate: FAR })).toBeUndefined();
    const repB = await inventoryReport(B, now);
    expect(repB.items.length).toBe(0);
    expect((await listItems(B)).length).toBe(0);
  });
});

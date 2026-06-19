import { describe, it, expect } from "vitest";
import {
  outstanding, lineFulfillment, poFulfillment, lineTotal, poTotal,
} from "@/lib/procurement";
import { createItem, inventoryReport } from "@/server/pharmacy/inventory";
import {
  createPurchaseOrder, listPurchaseOrders, getPurchaseOrder,
  setPoStatus, receiveGoods, listGoodsReceipts,
} from "@/server/pharmacy/procurement";

const now = new Date("2026-06-18T00:00:00.000Z");
const FUTURE = "2027-12-31";

describe("procurement: pure fulfillment & money", () => {
  it("outstanding subtracts and clamps", () => {
    expect(outstanding(10, 3)).toBe(7);
    expect(outstanding(3, 10)).toBe(0);
  });
  it("lineFulfillment transitions", () => {
    expect(lineFulfillment(10, 0)).toBe("pending");
    expect(lineFulfillment(10, 4)).toBe("partial");
    expect(lineFulfillment(10, 10)).toBe("complete");
    expect(lineFulfillment(10, 12)).toBe("complete");
  });
  it("poFulfillment rolls up (complete only when every line complete)", () => {
    expect(poFulfillment([])).toBe("pending");
    expect(poFulfillment([{ ordered: 5, received: 5 }, { ordered: 3, received: 4 }])).toBe("complete");
    expect(poFulfillment([{ ordered: 5, received: 2 }, { ordered: 3, received: 0 }])).toBe("partial");
    expect(poFulfillment([{ ordered: 5, received: 0 }])).toBe("pending");
  });
  it("money totals", () => {
    expect(lineTotal(5, 1000)).toBe(5000);
    expect(lineTotal(-5, 1000)).toBe(0);
    expect(poTotal([{ quantity: 5, unitPrice: 1000 }, { quantity: 2, unitPrice: 2000 }])).toBe(9000);
  });
});

describe("procurement: PO -> GR -> inventory (in-memory)", () => {
  const P = "proc-test-A";
  const B = "proc-test-B";
  let itemId1 = "";
  let itemId2 = "";
  let poId = "";
  let lineId1 = "";
  let lineId2 = "";

  it("creates a PO, validating items against the tenant catalogue", async () => {
    const i1 = await createItem(P, { name: "Paracetamol 500 mg", unit: "tablet", reorderPoint: 100 });
    const i2 = await createItem(P, { name: "Amoksisilin 500 mg", unit: "kapsul", reorderPoint: 50 });
    itemId1 = i1.id; itemId2 = i2.id;

    const po = await createPurchaseOrder(P, {
      supplier: "PT Kimia Farma",
      lines: [
        { itemId: i1.id, quantity: 100, unitPrice: 500 },
        { itemId: i2.id, quantity: 50, unitPrice: 2000 },
      ],
    });
    expect(po).toBeDefined();
    poId = po!.id;
    lineId1 = po!.lines.find((l) => l.itemId === i1.id)!.id;
    lineId2 = po!.lines.find((l) => l.itemId === i2.id)!.id;
    expect(po!.status).toBe("draft");
    expect(po!.lines.length).toBe(2);
    expect(po!.total).toBe(100 * 500 + 50 * 2000);
    expect(po!.fulfillment).toBe("pending");

    const bad = await createPurchaseOrder(P, { supplier: "X", lines: [{ itemId: "nope", quantity: 5, unitPrice: 10 }] });
    expect(bad).toBeUndefined();
    expect((await listPurchaseOrders(P)).some((o) => o.id === poId)).toBe(true);

    const detail0 = await getPurchaseOrder(P, poId);
    expect(Array.isArray(detail0!.receipts)).toBe(true);
    expect(detail0!.receipts!.length).toBe(0);
  });

  it("receiving goods raises received qty AND books inventory stock", async () => {
    expect((await setPoStatus(P, poId, "sent"))!.status).toBe("sent");

    const r1 = await receiveGoods(P, poId, { lineId: lineId1, batchNo: "GR-1", quantity: 40, expiryDate: FUTURE });
    expect(r1).toBeDefined();
    expect(r1!.line.receivedQty).toBe(40);
    expect(r1!.line.fulfillment).toBe("partial");
    expect(r1!.line.outstanding).toBe(60);

    let rep = await inventoryReport(P, now);
    expect(rep.items.find((x) => x.item.id === itemId1)!.totalStock).toBe(40);

    await receiveGoods(P, poId, { lineId: lineId1, batchNo: "GR-2", quantity: 60, expiryDate: FUTURE });
    rep = await inventoryReport(P, now);
    expect(rep.items.find((x) => x.item.id === itemId1)!.totalStock).toBe(100);

    await receiveGoods(P, poId, { lineId: lineId2, batchNo: "GR-3", quantity: 50, expiryDate: FUTURE });
    const detail = await getPurchaseOrder(P, poId);
    expect(detail!.fulfillment).toBe("complete");
    expect((await listGoodsReceipts(P, poId)).length).toBe(3);
    expect(detail!.receipts!.every((r) => !!r.batchId)).toBe(true);
  });

  it("guards bad receipts and cancelled POs", async () => {
    expect(await receiveGoods(P, poId, { lineId: lineId1, batchNo: "Z", quantity: 0, expiryDate: FUTURE })).toBeUndefined();
    expect(await receiveGoods(P, poId, { lineId: "nope", batchNo: "Z", quantity: 1, expiryDate: FUTURE })).toBeUndefined();

    const po2 = await createPurchaseOrder(P, { supplier: "PT Enseval", lines: [{ itemId: itemId1, quantity: 10, unitPrice: 500 }] });
    await setPoStatus(P, po2!.id, "cancelled");
    expect(await receiveGoods(P, po2!.id, { lineId: po2!.lines[0].id, batchNo: "Z", quantity: 1, expiryDate: FUTURE })).toBeUndefined();
  });

  it("is tenant-isolated", async () => {
    expect(await getPurchaseOrder(B, poId)).toBeUndefined();
    expect((await listPurchaseOrders(B)).length).toBe(0);
    expect(await receiveGoods(B, poId, { lineId: lineId1, batchNo: "Z", quantity: 1, expiryDate: FUTURE })).toBeUndefined();
    expect(await createPurchaseOrder(B, { supplier: "X", lines: [{ itemId: itemId1, quantity: 5, unitPrice: 10 }] })).toBeUndefined();
  });
});

import { describe, it, expect } from "vitest";
import { matchesLot, affectedBatches, recallImpact, isValidLot } from "@/lib/recall";
import { DEFAULT_LOCATION } from "@/lib/stock-transfer";
import { createItem, recordBatch, listBatches, inventoryReport } from "@/server/pharmacy/inventory";
import { issueRecall, withdrawRecall, listRecalls, recallSummary } from "@/server/pharmacy/recall";

const now = new Date("2026-06-20T00:00:00.000Z");
const FAR = "2027-06-20";

describe("recall: helpers (pure)", () => {
  it("matches lot numbers case-insensitively and trimmed", () => {
    expect(matchesLot("BPC-2405", "bpc-2405")).toBe(true);
    expect(matchesLot("  BPC-2405 ", "BPC-2405")).toBe(true);
    expect(matchesLot("BPC-2405", "BPC-2312")).toBe(false);
  });
  it("lists only in-stock batches of the lot", () => {
    const rows = [
      { batchNo: "L1", quantity: 10, location: null },
      { batchNo: "L1", quantity: 0, location: "Depo A" },
      { batchNo: "L2", quantity: 5, location: null },
    ];
    expect(affectedBatches(rows, "L1").map((b) => b.quantity)).toEqual([10]);
  });
  it("rolls up per-depot impact (null → main store, other lots/zero excluded)", () => {
    expect(recallImpact([
      { batchNo: "L1", quantity: 10, location: null },
      { batchNo: "L1", quantity: 4, location: "Depo IGD" },
      { batchNo: "L1", quantity: 0, location: "Depo A" },
      { batchNo: "L2", quantity: 7, location: null },
    ], "l1")).toEqual({ batchCount: 2, totalQuantity: 14, byLocation: { [DEFAULT_LOCATION]: 10, "Depo IGD": 4 } });
  });
  it("validates a lot number", () => {
    expect(isValidLot("BPC-2405")).toBe(true);
    expect(isValidLot("  ")).toBe(false);
  });
});

describe("recall: trace across depots + withdraw (in-memory)", () => {
  const A = "recall-test-A";
  const B = "recall-test-B";
  let itemId = "";
  let recallId = "";

  it("sets up a lot spread across two depots plus an unrelated lot", async () => {
    const item = await createItem(A, { name: "Paracetamol 500 mg", unit: "tablet", reorderPoint: 50 });
    itemId = item.id;
    await recordBatch(A, item.id, { batchNo: "LOT-RC1", quantity: 100, expiryDate: FAR });                        // main store
    await recordBatch(A, item.id, { batchNo: "LOT-RC1", quantity: 40, expiryDate: FAR, location: "Depo IGD" });   // transferred clone
    await recordBatch(A, item.id, { batchNo: "LOT-OTHER", quantity: 25, expiryDate: FAR });                       // must be untouched
    expect((await inventoryReport(A, now)).items[0].totalStock).toBe(165);
  });

  it("issues a recall that snapshots the lot across both depots (case-insensitive)", async () => {
    const recall = await issueRecall(A, { lotNo: "lot-rc1", reason: "Recall BPOM batch cemaran" });
    recallId = recall.id;
    expect(recall.status).toBe("open");
    expect(recall.batchCount).toBe(2);
    expect(recall.totalQuantity).toBe(140);
    expect(recall.itemName).toBe("Paracetamol 500 mg");
    expect(recall.withdrawnQuantity).toBe(0);
    expect((await recallSummary(A)).open).toBe(1);
  });

  it("withdraws the lot — zeroes every matching batch, leaving other lots intact", async () => {
    const r = await withdrawRecall(A, recallId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.recall.status).toBe("completed");
    expect(r.recall.withdrawnQuantity).toBe(140);
    expect(r.recall.completedAt).not.toBeNull();

    const batches = await listBatches(A, itemId);
    for (const b of batches.filter((x) => x.batchNo === "LOT-RC1")) expect(b.quantity).toBe(0);
    expect(batches.find((b) => b.batchNo === "LOT-OTHER")!.quantity).toBe(25);
    // On-hand for the item drops by exactly the recalled quantity.
    expect((await inventoryReport(A, now)).items[0].totalStock).toBe(25);
  });

  it("rejects re-executing a completed recall and unknown recalls", async () => {
    const again = await withdrawRecall(A, recallId);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe("already_completed");
    const nf = await withdrawRecall(A, "nope");
    expect(nf.ok).toBe(false);
    if (!nf.ok) expect(nf.reason).toBe("not_found");
  });

  it("allows a precautionary recall with no active stock", async () => {
    const recall = await issueRecall(A, { lotNo: "GHOST-LOT", reason: "Pencegahan" });
    expect(recall.batchCount).toBe(0);
    expect(recall.totalQuantity).toBe(0);
    const r = await withdrawRecall(A, recall.id);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.recall.withdrawnQuantity).toBe(0);
  });

  it("summarises and stays tenant-isolated", async () => {
    const sum = await recallSummary(A);
    expect(sum.open).toBe(0);
    expect(sum.completed).toBe(2);
    expect(sum.totalWithdrawn).toBe(140);
    // Company B cannot touch A's recall and has its own (empty) ledger.
    expect((await withdrawRecall(B, recallId)).ok).toBe(false);
    expect((await listRecalls(B)).length).toBe(0);
  });
});

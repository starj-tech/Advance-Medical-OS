/**
 * Drug/lot recall (Domain C/WS19), atop the inventory model. A recall is raised against a
 * manufacturer lot; it snapshots every on-hand batch carrying that lot across all depots,
 * then — when executed — withdraws (zeroes) those batches from on-hand stock so the recalled
 * product can no longer be dispensed. The recall row is the audit record of what was pulled,
 * from where, and how much. Tenant-scoped; env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";
import { listItems, listBatches, setBatchQuantity, type InventoryBatch } from "./inventory";
import { affectedBatches, recallImpact, type RecallStatus } from "@/lib/recall";

export interface Recall {
  id: string;
  companyId: string;
  lotNo: string;
  itemName: string;
  reason: string;
  status: RecallStatus;
  batchCount: number;
  totalQuantity: number;
  withdrawnQuantity: number;
  issuedBy: string | null;
  issuedAt: string;
  completedAt: string | null;
}

type Row = {
  id: string; company_id: string; lot_no: string; item_name: string; reason: string; status: RecallStatus;
  batch_count: number; total_quantity: number; withdrawn_quantity: number;
  issued_by: string | null; issued_at: string; completed_at: string | null;
};
const toRecall = (r: Row): Recall => ({
  id: r.id, companyId: r.company_id, lotNo: r.lot_no, itemName: r.item_name, reason: r.reason, status: r.status,
  batchCount: Number(r.batch_count), totalQuantity: Number(r.total_quantity), withdrawnQuantity: Number(r.withdrawn_quantity),
  issuedBy: r.issued_by, issuedAt: r.issued_at, completedAt: r.completed_at,
});

const g = globalThis as unknown as { __abeccaRecalls?: Recall[] };
const mem = g.__abeccaRecalls ?? (g.__abeccaRecalls = []);

/** Every batch the tenant holds, paired with its item name (for tracing a lot across items). */
async function allBatches(companyId: string): Promise<{ batches: InventoryBatch[]; nameOf: Map<string, string> }> {
  const items = await listItems(companyId);
  const nameOf = new Map(items.map((i) => [i.id, i.name]));
  const lists = await Promise.all(items.map((i) => listBatches(companyId, i.id)));
  return { batches: lists.flat(), nameOf };
}

/** Snapshot the affected item name(s): the single product, or a marker when a lot spans items. */
function itemNameFor(batches: InventoryBatch[], nameOf: Map<string, string>): string {
  const names = new Set(batches.map((b) => nameOf.get(b.itemId) ?? b.itemId));
  if (names.size === 1) return [...names][0];
  if (names.size === 0) return "—";
  return "Beberapa item";
}

/**
 * Raise a recall against `lotNo`. Snapshots the affected on-hand batches across all depots.
 * A precautionary recall with no current stock is still valid (batchCount 0) — it records the
 * notice. Returns the open recall; execute it with `withdrawRecall`.
 */
export async function issueRecall(
  companyId: string,
  input: { lotNo: string; reason: string; issuedBy?: string | null },
): Promise<Recall> {
  const lotNo = input.lotNo.trim();
  const { batches, nameOf } = await allBatches(companyId);
  const hit = affectedBatches(batches, lotNo);
  const impact = recallImpact(batches, lotNo);
  const itemName = itemNameFor(hit, nameOf);

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("recalls")
      .insert({
        company_id: companyId, lot_no: lotNo, item_name: itemName, reason: input.reason, status: "open",
        batch_count: impact.batchCount, total_quantity: impact.totalQuantity, withdrawn_quantity: 0,
        issued_by: input.issuedBy ?? null,
      })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "issue recall failed");
    return toRecall(data as Row);
  }
  const recall: Recall = {
    id: crypto.randomUUID(), companyId, lotNo, itemName, reason: input.reason, status: "open",
    batchCount: impact.batchCount, totalQuantity: impact.totalQuantity, withdrawnQuantity: 0,
    issuedBy: input.issuedBy ?? null, issuedAt: new Date().toISOString(), completedAt: null,
  };
  mem.push(recall);
  return recall;
}

async function getRecall(companyId: string, id: string): Promise<Recall | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("recalls").select("*").eq("company_id", companyId).eq("id", id).maybeSingle();
    return data ? toRecall(data as Row) : undefined;
  }
  return mem.find((r) => r.companyId === companyId && r.id === id);
}

export type WithdrawResult =
  | { ok: true; recall: Recall }
  | { ok: false; reason: "not_found" | "already_completed" };

/**
 * Execute a recall: re-trace the lot's current on-hand batches and withdraw (zero) them, then
 * close the recall recording the quantity actually pulled. Re-tracing at execution time means
 * stock that moved between depots since the notice is still caught.
 */
export async function withdrawRecall(companyId: string, id: string): Promise<WithdrawResult> {
  const recall = await getRecall(companyId, id);
  if (!recall) return { ok: false, reason: "not_found" };
  if (recall.status === "completed") return { ok: false, reason: "already_completed" };

  const { batches } = await allBatches(companyId);
  const hit = affectedBatches(batches, recall.lotNo);
  let withdrawn = 0;
  for (const b of hit) {
    withdrawn += b.quantity;
    await setBatchQuantity(companyId, b.id, 0);
  }
  const completedAt = new Date().toISOString();

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("recalls")
      .update({ status: "completed", withdrawn_quantity: withdrawn, completed_at: completedAt })
      .eq("company_id", companyId).eq("id", id).select("*").single();
    if (error || !data) throw new Error(error?.message ?? "withdraw recall failed");
    return { ok: true, recall: toRecall(data as Row) };
  }
  recall.status = "completed";
  recall.withdrawnQuantity = withdrawn;
  recall.completedAt = completedAt;
  return { ok: true, recall };
}

export async function listRecalls(companyId: string): Promise<Recall[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("recalls").select("*").eq("company_id", companyId).order("issued_at", { ascending: false });
    return (data ?? []).map((r) => toRecall(r as Row));
  }
  return mem.filter((r) => r.companyId === companyId).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

export interface RecallSummary {
  open: number;
  completed: number;
  totalWithdrawn: number;
}
export async function recallSummary(companyId: string): Promise<RecallSummary> {
  const all = await listRecalls(companyId);
  return {
    open: all.filter((r) => r.status === "open").length,
    completed: all.filter((r) => r.status === "completed").length,
    totalWithdrawn: all.reduce((s, r) => s + r.withdrawnQuantity, 0),
  };
}

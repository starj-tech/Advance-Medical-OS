/**
 * Stock-take (opname) register — physical inventory reconciliation. Each count snapshots
 * a batch's system on-hand quantity (server/pharmacy/inventory) and records the counted
 * quantity + signed variance (lib/stock-take); applying a count adjusts the batch to the
 * counted value (setBatchQuantity). The snapshot makes the record an immutable audit of
 * what was found, even after later movements. Tenant-scoped; env-gated.
 */
import { getSupabase } from "../supabase";
import { getBatch, setBatchQuantity } from "./inventory";
import { variance, varianceStatus, type VarianceStatus } from "@/lib/stock-take";

export interface StockTakeRecord {
  id: string;
  companyId: string;
  batchId: string;
  itemId: string;
  batchNo: string;
  systemQty: number;
  countedQty: number;
  variance: number;
  applied: boolean;
  note: string | null;
  createdAt: string;
}

type Row = {
  id: string; company_id: string; batch_id: string; item_id: string; batch_no: string;
  system_qty: number; counted_qty: number; variance: number; applied: boolean; note: string | null; created_at: string;
};
const toRecord = (r: Row): StockTakeRecord => ({
  id: r.id, companyId: r.company_id, batchId: r.batch_id, itemId: r.item_id, batchNo: r.batch_no,
  systemQty: Number(r.system_qty), countedQty: Number(r.counted_qty), variance: Number(r.variance),
  applied: !!r.applied, note: r.note, createdAt: r.created_at,
});

const g = globalThis as unknown as { __abeccaStockTakes?: StockTakeRecord[] };
const takes = g.__abeccaStockTakes ?? (g.__abeccaStockTakes = []);

/** Record a count against a batch; snapshots the current on-hand as systemQty. */
export async function recordStockTake(
  companyId: string,
  batchId: string,
  input: { countedQty: number; note?: string | null; countedBy?: string | null },
): Promise<StockTakeRecord | undefined> {
  const batch = await getBatch(companyId, batchId);
  if (!batch) return undefined;
  const countedQty = Math.max(0, Math.floor(input.countedQty));
  const systemQty = batch.quantity;
  const v = variance(systemQty, countedQty);

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("stock_takes")
      .insert({ company_id: companyId, batch_id: batchId, item_id: batch.itemId, batch_no: batch.batchNo, system_qty: systemQty, counted_qty: countedQty, variance: v, applied: false, note: input.note ?? null, counted_by: input.countedBy ?? null })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "record stock-take failed");
    return toRecord(data as Row);
  }
  const rec: StockTakeRecord = {
    id: crypto.randomUUID(), companyId, batchId, itemId: batch.itemId, batchNo: batch.batchNo,
    systemQty, countedQty, variance: v, applied: false, note: input.note ?? null, createdAt: new Date().toISOString(),
  };
  takes.push(rec);
  return rec;
}

export async function listStockTakes(companyId: string, opts: { itemId?: string } = {}): Promise<StockTakeRecord[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("stock_takes").select("*").eq("company_id", companyId);
    if (opts.itemId) q = q.eq("item_id", opts.itemId);
    const { data } = await q.order("created_at", { ascending: false });
    return (data ?? []).map((r) => toRecord(r as Row));
  }
  return takes
    .filter((t) => t.companyId === companyId && (!opts.itemId || t.itemId === opts.itemId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Apply a count: set the batch on-hand to the counted quantity and mark the record applied. */
export async function applyStockTake(companyId: string, id: string): Promise<StockTakeRecord | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data: existing } = await sb.from("stock_takes").select("*").eq("company_id", companyId).eq("id", id).maybeSingle();
    if (!existing) return undefined;
    const rec = toRecord(existing as Row);
    await setBatchQuantity(companyId, rec.batchId, rec.countedQty);
    const { data } = await sb.from("stock_takes").update({ applied: true }).eq("company_id", companyId).eq("id", id).select("*").maybeSingle();
    return data ? toRecord(data as Row) : undefined;
  }
  const rec = takes.find((t) => t.companyId === companyId && t.id === id);
  if (!rec) return undefined;
  await setBatchQuantity(companyId, rec.batchId, rec.countedQty);
  rec.applied = true;
  return rec;
}

export interface StockTakeSummary {
  total: number;
  applied: number;
  byStatus: Record<VarianceStatus, number>;
}

export async function stockTakeSummary(companyId: string): Promise<StockTakeSummary> {
  const all = await listStockTakes(companyId);
  const byStatus: Record<VarianceStatus, number> = { match: 0, surplus: 0, shortage: 0 };
  let applied = 0;
  for (const t of all) {
    byStatus[varianceStatus(t.variance)] += 1;
    if (t.applied) applied += 1;
  }
  return { total: all.length, applied, byStatus };
}

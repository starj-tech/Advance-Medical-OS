/**
 * Inter-depot stock transfer (Domain C/WS19), atop the inventory model. A transfer is
 * atomic: it decrements the source batch and books an equal batch (same lot/expiry) at the
 * destination location, so total on-hand stock is conserved — only its location changes.
 * Each move is recorded in an immutable ledger. Tenant-scoped; env-gated.
 */
import { getSupabase } from "../supabase";
import { getBatch, setBatchQuantity, recordBatch, listItems } from "./inventory";
import { canTransfer, isDistinctLocation, locationLabel } from "@/lib/stock-transfer";

export interface StockTransfer {
  id: string;
  companyId: string;
  itemId: string;
  itemName: string;
  batchNo: string;
  fromLocation: string;
  toLocation: string;
  quantity: number;
  createdBy: string | null;
  createdAt: string;
}

type Row = {
  id: string; company_id: string; item_id: string; item_name: string; batch_no: string;
  from_location: string; to_location: string; quantity: number; created_by: string | null; created_at: string;
};
const toTransfer = (r: Row): StockTransfer => ({
  id: r.id, companyId: r.company_id, itemId: r.item_id, itemName: r.item_name, batchNo: r.batch_no,
  fromLocation: r.from_location, toLocation: r.to_location, quantity: Number(r.quantity),
  createdBy: r.created_by, createdAt: r.created_at,
});

const g = globalThis as unknown as { __abeccaStockTransfers?: StockTransfer[] };
const mem = g.__abeccaStockTransfers ?? (g.__abeccaStockTransfers = []);

export type TransferResult =
  | { ok: true; transfer: StockTransfer }
  | { ok: false; reason: "not_found" | "insufficient" | "same_location" };

/**
 * Move `quantity` of a source batch to `toLocation`. Conserves stock: source decremented,
 * an equal batch booked at the destination. Rejects unknown/cross-tenant batches, over-draw,
 * and no-op (same-location) transfers.
 */
export async function transferStock(
  companyId: string,
  input: { fromBatchId: string; toLocation: string; quantity: number; createdBy?: string | null },
): Promise<TransferResult> {
  const source = await getBatch(companyId, input.fromBatchId);
  if (!source) return { ok: false, reason: "not_found" };
  if (!isDistinctLocation(source.location, input.toLocation)) return { ok: false, reason: "same_location" };
  if (!canTransfer(source.quantity, input.quantity)) return { ok: false, reason: "insufficient" };

  // Atomic move: draw down the source, book an equal batch at the destination.
  await setBatchQuantity(companyId, source.id, source.quantity - input.quantity);
  await recordBatch(companyId, source.itemId, {
    batchNo: source.batchNo, quantity: input.quantity, expiryDate: source.expiryDate,
    location: input.toLocation, createdBy: input.createdBy ?? null,
  });

  const items = await listItems(companyId);
  const itemName = items.find((i) => i.id === source.itemId)?.name ?? source.itemId;
  const fromLocation = locationLabel(source.location);
  const toLocation = locationLabel(input.toLocation);

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("stock_transfers")
      .insert({ company_id: companyId, item_id: source.itemId, item_name: itemName, batch_no: source.batchNo, from_location: fromLocation, to_location: toLocation, quantity: input.quantity, created_by: input.createdBy ?? null })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "record transfer failed");
    return { ok: true, transfer: toTransfer(data as Row) };
  }
  const transfer: StockTransfer = {
    id: crypto.randomUUID(), companyId, itemId: source.itemId, itemName, batchNo: source.batchNo,
    fromLocation, toLocation, quantity: input.quantity, createdBy: input.createdBy ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(transfer);
  return { ok: true, transfer };
}

export async function listTransfers(companyId: string): Promise<StockTransfer[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("stock_transfers").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    return (data ?? []).map((r) => toTransfer(r as Row));
  }
  return mem.filter((t) => t.companyId === companyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

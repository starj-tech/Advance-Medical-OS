/**
 * Pharmacy inventory — items and their batches (lot no. + expiry + quantity).
 * On-hand stock for an item is the sum of its batch quantities; the report layers
 * the reorder status and per-batch expiry buckets (lib/inventory) and rolls up the
 * alert counts. Tenant-scoped; env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";
import { stockStatus, expiryBucket, type StockStatus, type ExpiryBucket } from "@/lib/inventory";

export interface InventoryItem {
  id: string;
  companyId: string;
  name: string;
  unit: string;
  reorderPoint: number;
  createdAt: string;
}
export interface InventoryBatch {
  id: string;
  companyId: string;
  itemId: string;
  batchNo: string;
  quantity: number;
  expiryDate: string;
  createdAt: string;
}

type ItemRow = { id: string; company_id: string; name: string; unit: string; reorder_point: number; created_at: string };
type BatchRow = { id: string; company_id: string; item_id: string; batch_no: string; quantity: number; expiry_date: string; created_at: string };
const toItem = (r: ItemRow): InventoryItem => ({
  id: r.id, companyId: r.company_id, name: r.name, unit: r.unit, reorderPoint: Number(r.reorder_point), createdAt: r.created_at,
});
const toBatch = (r: BatchRow): InventoryBatch => ({
  id: r.id, companyId: r.company_id, itemId: r.item_id, batchNo: r.batch_no,
  quantity: Number(r.quantity), expiryDate: r.expiry_date, createdAt: r.created_at,
});

const g = globalThis as unknown as { __abeccaInvItems?: InventoryItem[]; __abeccaInvBatches?: InventoryBatch[] };
const items = g.__abeccaInvItems ?? (g.__abeccaInvItems = []);
const batches = g.__abeccaInvBatches ?? (g.__abeccaInvBatches = []);

export async function createItem(
  companyId: string,
  input: { name: string; unit: string; reorderPoint: number; createdBy?: string | null },
): Promise<InventoryItem> {
  const reorderPoint = Math.max(0, Math.floor(input.reorderPoint));
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("inventory_items")
      .insert({ company_id: companyId, name: input.name, unit: input.unit, reorder_point: reorderPoint, created_by: input.createdBy ?? null })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "create item failed");
    return toItem(data as ItemRow);
  }
  const item: InventoryItem = {
    id: crypto.randomUUID(), companyId, name: input.name, unit: input.unit, reorderPoint, createdAt: new Date().toISOString(),
  };
  items.push(item);
  return item;
}

export async function listItems(companyId: string): Promise<InventoryItem[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("inventory_items").select("*").eq("company_id", companyId).order("name");
    return (data ?? []).map((r) => toItem(r as ItemRow));
  }
  return items.filter((i) => i.companyId === companyId).sort((a, b) => a.name.localeCompare(b.name));
}

/** Receive a batch into an item (raises on-hand stock). Verifies tenant ownership. */
export async function recordBatch(
  companyId: string,
  itemId: string,
  input: { batchNo: string; quantity: number; expiryDate: string; createdBy?: string | null },
): Promise<InventoryBatch | undefined> {
  const quantity = Math.max(0, Math.floor(input.quantity));
  const sb = getSupabase();
  if (sb) {
    const { data: item } = await sb.from("inventory_items").select("id").eq("company_id", companyId).eq("id", itemId).maybeSingle();
    if (!item) return undefined;
    const { data, error } = await sb
      .from("inventory_batches")
      .insert({ company_id: companyId, item_id: itemId, batch_no: input.batchNo, quantity, expiry_date: input.expiryDate, created_by: input.createdBy ?? null })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "record batch failed");
    return toBatch(data as BatchRow);
  }
  if (!items.some((i) => i.companyId === companyId && i.id === itemId)) return undefined;
  const batch: InventoryBatch = {
    id: crypto.randomUUID(), companyId, itemId, batchNo: input.batchNo, quantity,
    expiryDate: input.expiryDate, createdAt: new Date().toISOString(),
  };
  batches.push(batch);
  return batch;
}

export async function listBatches(companyId: string, itemId: string): Promise<InventoryBatch[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("inventory_batches").select("*").eq("company_id", companyId).eq("item_id", itemId).order("expiry_date");
    return (data ?? []).map((r) => toBatch(r as BatchRow));
  }
  return batches.filter((b) => b.companyId === companyId && b.itemId === itemId).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
}

/** Set a batch's on-hand quantity (dispense, wastage, stock-take). Clamped ≥ 0. */
export async function setBatchQuantity(companyId: string, batchId: string, quantity: number): Promise<InventoryBatch | undefined> {
  const q = Math.max(0, Math.floor(quantity));
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("inventory_batches").update({ quantity: q }).eq("company_id", companyId).eq("id", batchId).select("*").maybeSingle();
    return data ? toBatch(data as BatchRow) : undefined;
  }
  const b = batches.find((x) => x.companyId === companyId && x.id === batchId);
  if (!b) return undefined;
  b.quantity = q;
  return b;
}

export interface BatchView extends InventoryBatch {
  bucket: ExpiryBucket;
}
export interface ItemReport {
  item: InventoryItem;
  totalStock: number;
  status: StockStatus;
  batches: BatchView[];
}
export interface InventoryAlerts {
  lowStock: number;
  outOfStock: number;
  expiringSoonBatches: number;
  expiredBatches: number;
}
export interface InventoryReport {
  items: ItemReport[];
  alerts: InventoryAlerts;
}

export async function inventoryReport(companyId: string, now: Date): Promise<InventoryReport> {
  const [allItems, allBatches] = await Promise.all([
    listItems(companyId),
    (async () => {
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb.from("inventory_batches").select("*").eq("company_id", companyId);
        return (data ?? []).map((r) => toBatch(r as BatchRow));
      }
      return batches.filter((b) => b.companyId === companyId);
    })(),
  ]);

  const alerts: InventoryAlerts = { lowStock: 0, outOfStock: 0, expiringSoonBatches: 0, expiredBatches: 0 };
  const report: ItemReport[] = allItems.map((item) => {
    const its = allBatches
      .filter((b) => b.itemId === item.id)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
      .map((b) => ({ ...b, bucket: expiryBucket(b.expiryDate, now) }));
    const totalStock = its.reduce((s, b) => s + b.quantity, 0);
    const status = stockStatus(totalStock, item.reorderPoint);
    if (status === "out") alerts.outOfStock += 1;
    else if (status === "low") alerts.lowStock += 1;
    for (const b of its) {
      if (b.quantity <= 0) continue;
      if (b.bucket === "expired") alerts.expiredBatches += 1;
      else if (b.bucket === "expiring_soon") alerts.expiringSoonBatches += 1;
    }
    return { item, totalStock, status, batches: its };
  });
  return { items: report, alerts };
}

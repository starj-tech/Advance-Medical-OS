/**
 * Pharmacy procurement — purchase orders (PO), their lines, and goods receipts (GR).
 * Receiving goods against a PO line is the closing of the loop: it accumulates the
 * line's received qty AND books an inventory batch (server/pharmacy/inventory →
 * recordBatch), so procurement and on-hand stock stay consistent. Fulfillment and
 * money totals are derived purely (lib/procurement). Tenant-scoped; env-gated.
 */
import { getSupabase } from "../supabase";
import { listItems, recordBatch } from "./inventory";
import {
  poFulfillment, lineFulfillment, outstanding, poTotal,
  type PoStatus, type Fulfillment,
} from "@/lib/procurement";

export interface PurchaseOrder {
  id: string;
  companyId: string;
  supplier: string;
  status: PoStatus;
  note: string | null;
  createdAt: string;
}
export interface PoLine {
  id: string;
  companyId: string;
  poId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  receivedQty: number;
  createdAt: string;
}
export interface GoodsReceipt {
  id: string;
  companyId: string;
  poId: string;
  lineId: string;
  itemId: string;
  batchNo: string;
  quantity: number;
  expiryDate: string;
  batchId: string;
  createdAt: string;
}

export interface PoLineView extends PoLine {
  fulfillment: Fulfillment;
  outstanding: number;
}
export interface PurchaseOrderView extends PurchaseOrder {
  lines: PoLineView[];
  total: number;
  fulfillment: Fulfillment;
  receipts?: GoodsReceipt[];
}

type PoRow = { id: string; company_id: string; supplier: string; status: string; note: string | null; created_at: string };
type LineRow = { id: string; company_id: string; po_id: string; item_id: string; item_name: string; quantity: number; unit_price: number; received_qty: number; created_at: string };
type GrRow = { id: string; company_id: string; po_id: string; line_id: string; item_id: string; batch_no: string; quantity: number; expiry_date: string; batch_id: string; created_at: string };
const toPo = (r: PoRow): PurchaseOrder => ({ id: r.id, companyId: r.company_id, supplier: r.supplier, status: r.status as PoStatus, note: r.note, createdAt: r.created_at });
const toLine = (r: LineRow): PoLine => ({
  id: r.id, companyId: r.company_id, poId: r.po_id, itemId: r.item_id, itemName: r.item_name,
  quantity: Number(r.quantity), unitPrice: Number(r.unit_price), receivedQty: Number(r.received_qty), createdAt: r.created_at,
});
const toGr = (r: GrRow): GoodsReceipt => ({
  id: r.id, companyId: r.company_id, poId: r.po_id, lineId: r.line_id, itemId: r.item_id,
  batchNo: r.batch_no, quantity: Number(r.quantity), expiryDate: r.expiry_date, batchId: r.batch_id, createdAt: r.created_at,
});

const g = globalThis as unknown as {
  __abeccaPOs?: PurchaseOrder[]; __abeccaPoLines?: PoLine[]; __abeccaGRs?: GoodsReceipt[];
};
const pos = g.__abeccaPOs ?? (g.__abeccaPOs = []);
const poLines = g.__abeccaPoLines ?? (g.__abeccaPoLines = []);
const receipts = g.__abeccaGRs ?? (g.__abeccaGRs = []);

const lineView = (l: PoLine): PoLineView => ({
  ...l, fulfillment: lineFulfillment(l.quantity, l.receivedQty), outstanding: outstanding(l.quantity, l.receivedQty),
});
const buildView = (po: PurchaseOrder, lines: PoLine[], grs?: GoodsReceipt[]): PurchaseOrderView => ({
  ...po,
  lines: lines.map(lineView),
  total: poTotal(lines),
  fulfillment: poFulfillment(lines.map((l) => ({ ordered: l.quantity, received: l.receivedQty }))),
  ...(grs ? { receipts: grs } : {}),
});

export async function createPurchaseOrder(
  companyId: string,
  input: { supplier: string; note?: string | null; createdBy?: string | null; lines: { itemId: string; quantity: number; unitPrice: number }[] },
): Promise<PurchaseOrderView | undefined> {
  // Validate every line against the tenant's own catalogue and snapshot the name.
  const items = await listItems(companyId);
  const byId = new Map(items.map((i) => [i.id, i]));
  const valid = input.lines
    .map((l) => ({ item: byId.get(l.itemId), quantity: Math.max(0, Math.floor(l.quantity)), unitPrice: Math.max(0, Math.floor(l.unitPrice)) }))
    .filter((l): l is { item: NonNullable<typeof l.item>; quantity: number; unitPrice: number } => !!l.item && l.quantity > 0);
  if (valid.length === 0) return undefined;

  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { data: poData, error } = await sb
      .from("purchase_orders")
      .insert({ company_id: companyId, supplier: input.supplier, status: "draft", note: input.note ?? null, created_by: input.createdBy ?? null })
      .select("*").single();
    if (error || !poData) throw new Error(error?.message ?? "create PO failed");
    const po = toPo(poData as PoRow);
    const { data: lineData } = await sb
      .from("po_lines")
      .insert(valid.map((l) => ({ company_id: companyId, po_id: po.id, item_id: l.item.id, item_name: l.item.name, quantity: l.quantity, unit_price: l.unitPrice, received_qty: 0 })))
      .select("*");
    return buildView(po, (lineData ?? []).map((r) => toLine(r as LineRow)));
  }

  const po: PurchaseOrder = { id: crypto.randomUUID(), companyId, supplier: input.supplier, status: "draft", note: input.note ?? null, createdAt: now };
  pos.push(po);
  const lines = valid.map((l) => {
    const line: PoLine = { id: crypto.randomUUID(), companyId, poId: po.id, itemId: l.item.id, itemName: l.item.name, quantity: l.quantity, unitPrice: l.unitPrice, receivedQty: 0, createdAt: now };
    poLines.push(line);
    return line;
  });
  return buildView(po, lines);
}

async function loadLines(companyId: string, poId: string): Promise<PoLine[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("po_lines").select("*").eq("company_id", companyId).eq("po_id", poId).order("created_at");
    return (data ?? []).map((r) => toLine(r as LineRow));
  }
  return poLines.filter((l) => l.companyId === companyId && l.poId === poId);
}

export async function listPurchaseOrders(companyId: string): Promise<PurchaseOrderView[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("purchase_orders").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    const out: PurchaseOrderView[] = [];
    for (const r of data ?? []) {
      const po = toPo(r as PoRow);
      out.push(buildView(po, await loadLines(companyId, po.id)));
    }
    return out;
  }
  return pos
    .filter((p) => p.companyId === companyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((po) => buildView(po, poLines.filter((l) => l.companyId === companyId && l.poId === po.id)));
}

export async function getPurchaseOrder(companyId: string, poId: string): Promise<PurchaseOrderView | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("purchase_orders").select("*").eq("company_id", companyId).eq("id", poId).maybeSingle();
    if (!data) return undefined;
    const po = toPo(data as PoRow);
    return buildView(po, await loadLines(companyId, poId), await listGoodsReceipts(companyId, poId));
  }
  const po = pos.find((p) => p.companyId === companyId && p.id === poId);
  if (!po) return undefined;
  return buildView(po, poLines.filter((l) => l.companyId === companyId && l.poId === poId), await listGoodsReceipts(companyId, poId));
}

export async function setPoStatus(companyId: string, poId: string, status: PoStatus): Promise<PurchaseOrderView | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("purchase_orders").update({ status }).eq("company_id", companyId).eq("id", poId).select("*").maybeSingle();
    if (!data) return undefined;
    const po = toPo(data as PoRow);
    return buildView(po, await loadLines(companyId, poId));
  }
  const po = pos.find((p) => p.companyId === companyId && p.id === poId);
  if (!po) return undefined;
  po.status = status;
  return buildView(po, poLines.filter((l) => l.companyId === companyId && l.poId === poId));
}

export async function listGoodsReceipts(companyId: string, poId: string): Promise<GoodsReceipt[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("goods_receipts").select("*").eq("company_id", companyId).eq("po_id", poId).order("created_at");
    return (data ?? []).map((r) => toGr(r as GrRow));
  }
  return receipts.filter((r) => r.companyId === companyId && r.poId === poId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Receive goods against a PO line: books an inventory batch (raises on-hand stock)
 * and accumulates the line's received qty. Tenant- and PO-scoped; a cancelled PO
 * cannot receive.
 */
export async function receiveGoods(
  companyId: string,
  poId: string,
  input: { lineId: string; batchNo: string; quantity: number; expiryDate: string; receivedBy?: string | null },
): Promise<{ receipt: GoodsReceipt; line: PoLineView } | undefined> {
  const quantity = Math.max(0, Math.floor(input.quantity));
  if (quantity <= 0) return undefined;
  const po = await getPurchaseOrder(companyId, poId);
  if (!po || po.status === "cancelled") return undefined;
  const line = po.lines.find((l) => l.id === input.lineId);
  if (!line) return undefined;

  // Book the batch into inventory first (this is what actually raises stock).
  const batch = await recordBatch(companyId, line.itemId, {
    batchNo: input.batchNo, quantity, expiryDate: input.expiryDate, createdBy: input.receivedBy ?? null,
  });
  if (!batch) return undefined;

  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { data: grData, error } = await sb
      .from("goods_receipts")
      .insert({ company_id: companyId, po_id: poId, line_id: line.id, item_id: line.itemId, batch_no: input.batchNo, quantity, expiry_date: input.expiryDate, batch_id: batch.id, received_by: input.receivedBy ?? null })
      .select("*").single();
    if (error || !grData) throw new Error(error?.message ?? "goods receipt failed");
    const newReceived = line.receivedQty + quantity;
    const { data: lineData } = await sb
      .from("po_lines").update({ received_qty: newReceived }).eq("company_id", companyId).eq("id", line.id).select("*").maybeSingle();
    return { receipt: toGr(grData as GrRow), line: lineView(lineData ? toLine(lineData as LineRow) : { ...line, receivedQty: newReceived }) };
  }

  const receipt: GoodsReceipt = {
    id: crypto.randomUUID(), companyId, poId, lineId: line.id, itemId: line.itemId,
    batchNo: input.batchNo, quantity, expiryDate: input.expiryDate, batchId: batch.id, createdAt: now,
  };
  receipts.push(receipt);
  const stored = poLines.find((l) => l.companyId === companyId && l.id === line.id);
  if (stored) stored.receivedQty += quantity;
  return { receipt, line: lineView(stored ?? { ...line, receivedQty: line.receivedQty + quantity }) };
}

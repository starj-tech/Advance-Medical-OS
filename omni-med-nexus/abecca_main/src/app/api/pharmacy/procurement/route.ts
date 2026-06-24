import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createPurchaseOrder, listPurchaseOrders } from "@/server/pharmacy/procurement";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET() {
  const guard = await requirePermission("procurement:read");
  if (guard.error) return guard.error;
  const orders = await listPurchaseOrders(guard.session.company.id);
  return NextResponse.json({ orders });
}

/** Create a draft purchase order with one or more lines (item × qty × unit price). */
export async function POST(request: Request) {
  const guard = await requirePermission("procurement:manage");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const supplier = str(body?.supplier);
  if (!supplier) return NextResponse.json({ error: "Pemasok wajib diisi" }, { status: 400 });
  const rawLines = Array.isArray(body?.lines) ? body.lines : [];
  const lines = rawLines
    .map((l: unknown) => {
      const o = (l ?? {}) as Record<string, unknown>;
      return { itemId: str(o.itemId), quantity: Number(o.quantity), unitPrice: Number(o.unitPrice) };
    })
    .filter((l: { itemId: string; quantity: number; unitPrice: number }) => l.itemId && Number.isFinite(l.quantity) && l.quantity > 0 && Number.isFinite(l.unitPrice) && l.unitPrice >= 0);
  if (lines.length === 0) {
    return NextResponse.json({ error: "Minimal satu baris item dengan jumlah valid" }, { status: 400 });
  }
  const po = await createPurchaseOrder(guard.session.company.id, {
    supplier, note: str(body?.note) || null, createdBy: guard.session.user.id, lines,
  });
  if (!po) return NextResponse.json({ error: "Item tidak ditemukan untuk perusahaan ini" }, { status: 400 });
  return NextResponse.json(po, { status: 201 });
}

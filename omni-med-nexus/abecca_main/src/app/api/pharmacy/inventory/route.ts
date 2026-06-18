import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createItem, inventoryReport } from "@/server/pharmacy/inventory";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Stock report: every item with on-hand total, reorder status, batches, plus roll-up alerts. */
export async function GET() {
  const guard = await requirePermission("formulary:read");
  if (guard.error) return guard.error;
  const report = await inventoryReport(guard.session.company.id, new Date());
  return NextResponse.json(report);
}

/** Register a stock item (the thing batches are received against). */
export async function POST(request: Request) {
  const guard = await requirePermission("formulary:dispense");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const name = str(body?.name);
  const unit = str(body?.unit);
  if (!name || !unit) {
    return NextResponse.json({ error: "Nama dan satuan wajib diisi" }, { status: 400 });
  }
  const reorderPoint = Number(body?.reorderPoint);
  if (!Number.isFinite(reorderPoint) || reorderPoint < 0) {
    return NextResponse.json({ error: "Titik pemesanan ulang tidak valid" }, { status: 400 });
  }
  const item = await createItem(guard.session.company.id, {
    name, unit, reorderPoint, createdBy: guard.session.user.id,
  });
  return NextResponse.json(item, { status: 201 });
}

import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { setBatchQuantity } from "@/server/pharmacy/inventory";

export const dynamic = "force-dynamic";

/** Adjust a batch's on-hand quantity (dispense, wastage, stock-take). */
export async function PATCH(request: Request, context: { params: Promise<{ batchId: string }> }) {
  const guard = await requirePermission("formulary:dispense");
  if (guard.error) return guard.error;
  const { batchId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const quantity = Number(body?.quantity);
  if (!Number.isFinite(quantity) || quantity < 0) {
    return NextResponse.json({ error: "Jumlah tidak valid" }, { status: 400 });
  }
  const batch = await setBatchQuantity(guard.session.company.id, batchId, quantity);
  if (!batch) return NextResponse.json({ error: "Batch tidak ditemukan" }, { status: 404 });
  return NextResponse.json(batch);
}

import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { applyStockTake } from "@/server/pharmacy/stock-take";

export const dynamic = "force-dynamic";

/** Apply a count → adjusts the batch on-hand to the counted quantity. */
export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("formulary:dispense");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const rec = await applyStockTake(guard.session.company.id, id);
  if (!rec) return NextResponse.json({ error: "Opname tidak ditemukan" }, { status: 404 });
  return NextResponse.json(rec);
}

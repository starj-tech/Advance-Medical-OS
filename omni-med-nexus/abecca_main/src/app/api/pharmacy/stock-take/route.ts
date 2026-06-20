import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { recordStockTake, listStockTakes, stockTakeSummary } from "@/server/pharmacy/stock-take";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET() {
  const guard = await requirePermission("formulary:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const [records, summary] = await Promise.all([listStockTakes(companyId), stockTakeSummary(companyId)]);
  return NextResponse.json({ takes: records, summary });
}

/** Record a count against a batch (snapshots system on-hand, computes variance). */
export async function POST(request: Request) {
  const guard = await requirePermission("formulary:dispense");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const batchId = str(body?.batchId);
  if (!batchId) return NextResponse.json({ error: "Batch wajib dipilih" }, { status: 400 });
  const countedQty = Number(body?.countedQty);
  if (!Number.isFinite(countedQty) || countedQty < 0) {
    return NextResponse.json({ error: "Jumlah hasil hitung tidak valid" }, { status: 400 });
  }
  const rec = await recordStockTake(guard.session.company.id, batchId, {
    countedQty, note: str(body?.note) || null, countedBy: guard.session.user.id,
  });
  if (!rec) return NextResponse.json({ error: "Batch tidak ditemukan" }, { status: 404 });
  return NextResponse.json(rec, { status: 201 });
}

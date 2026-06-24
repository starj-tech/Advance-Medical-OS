import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { listBatches, recordBatch } from "@/server/pharmacy/inventory";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("formulary:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const batches = await listBatches(guard.session.company.id, id);
  return NextResponse.json({ batches });
}

/** Receive a batch into an item (raises on-hand stock). */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("formulary:dispense");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const batchNo = str(body?.batchNo);
  const expiryDate = str(body?.expiryDate);
  if (!batchNo || !expiryDate) {
    return NextResponse.json({ error: "Nomor batch dan tanggal kedaluwarsa wajib diisi" }, { status: 400 });
  }
  if (Number.isNaN(Date.parse(expiryDate))) {
    return NextResponse.json({ error: "Tanggal kedaluwarsa tidak valid" }, { status: 400 });
  }
  const quantity = Number(body?.quantity);
  if (!Number.isFinite(quantity) || quantity < 0) {
    return NextResponse.json({ error: "Jumlah tidak valid" }, { status: 400 });
  }
  const batch = await recordBatch(guard.session.company.id, id, {
    batchNo, quantity, expiryDate, createdBy: guard.session.user.id,
  });
  if (!batch) return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });
  return NextResponse.json(batch, { status: 201 });
}

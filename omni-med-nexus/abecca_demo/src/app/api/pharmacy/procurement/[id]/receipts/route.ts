import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { receiveGoods } from "@/server/pharmacy/procurement";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Receive goods against a PO line → books an inventory batch and raises received qty. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("procurement:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const lineId = str(body?.lineId);
  const batchNo = str(body?.batchNo);
  const expiryDate = str(body?.expiryDate);
  if (!lineId || !batchNo || !expiryDate) {
    return NextResponse.json({ error: "Baris, nomor batch, dan tanggal kedaluwarsa wajib diisi" }, { status: 400 });
  }
  if (Number.isNaN(Date.parse(expiryDate))) {
    return NextResponse.json({ error: "Tanggal kedaluwarsa tidak valid" }, { status: 400 });
  }
  const quantity = Number(body?.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Jumlah terima harus lebih dari nol" }, { status: 400 });
  }
  const result = await receiveGoods(guard.session.company.id, id, {
    lineId, batchNo, quantity, expiryDate, receivedBy: guard.session.user.id,
  });
  if (!result) return NextResponse.json({ error: "Gagal menerima — PO/baris tidak ditemukan atau PO dibatalkan" }, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}

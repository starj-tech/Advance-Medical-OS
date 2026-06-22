import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { transferStock, listTransfers } from "@/server/pharmacy/stock-transfer";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET() {
  const guard = await requirePermission("formulary:read");
  if (guard.error) return guard.error;
  return NextResponse.json({ transfers: await listTransfers(guard.session.company.id) });
}

export async function POST(request: Request) {
  const guard = await requirePermission("formulary:dispense");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const fromBatchId = str(body?.fromBatchId);
  const toLocation = str(body?.toLocation);
  const quantity = Number(body?.quantity);
  if (!fromBatchId || !toLocation) return NextResponse.json({ error: "Batch sumber dan depo tujuan wajib diisi" }, { status: 400 });
  if (!Number.isInteger(quantity) || quantity <= 0) return NextResponse.json({ error: "Jumlah harus bilangan bulat > 0" }, { status: 400 });

  const result = await transferStock(guard.session.company.id, {
    fromBatchId, toLocation, quantity, createdBy: guard.session.user.id,
  });
  if (!result.ok) {
    const map = {
      not_found: { error: "Batch sumber tidak ditemukan", status: 404 },
      insufficient: { error: "Stok sumber tidak mencukupi", status: 409 },
      same_location: { error: "Depo tujuan sama dengan lokasi sumber", status: 409 },
    } as const;
    const m = map[result.reason];
    return NextResponse.json({ error: m.error }, { status: m.status });
  }
  return NextResponse.json(result.transfer, { status: 201 });
}

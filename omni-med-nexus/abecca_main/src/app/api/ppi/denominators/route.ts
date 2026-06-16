import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { listDenominators, recordDenominator } from "@/server/ppi/surveillance";
import { isHaiType } from "@/lib/hai";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET(request: Request) {
  const guard = await requirePermission("ikp:read");
  if (guard.error) return guard.error;
  const period = new URL(request.url).searchParams.get("period") || undefined;
  return NextResponse.json(await listDenominators(guard.session.company.id, { period }));
}

export async function POST(request: Request) {
  const guard = await requirePermission("ikp:report");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const period = str(body?.period);
  const unit = str(body?.unit);
  const deviceDays = Number(body?.deviceDays);
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "Periode harus format YYYY-MM" }, { status: 400 });
  }
  if (!isHaiType(body?.haiType)) {
    return NextResponse.json({ error: "Jenis HAI tidak valid" }, { status: 400 });
  }
  if (!unit || !Number.isFinite(deviceDays) || deviceDays < 0) {
    return NextResponse.json({ error: "Unit dan jumlah hari-alat (≥0) wajib diisi" }, { status: 400 });
  }
  const d = await recordDenominator(guard.session.company.id, {
    period, haiType: body.haiType, unit, deviceDays, createdBy: guard.session.user.id,
  });
  return NextResponse.json(d, { status: 201 });
}

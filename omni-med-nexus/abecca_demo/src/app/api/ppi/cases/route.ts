import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { listCases, recordCase } from "@/server/ppi/surveillance";
import { isHaiType } from "@/lib/hai";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET(request: Request) {
  const guard = await requirePermission("ikp:read");
  if (guard.error) return guard.error;
  const period = new URL(request.url).searchParams.get("period") || undefined;
  return NextResponse.json(await listCases(guard.session.company.id, { period }));
}

export async function POST(request: Request) {
  const guard = await requirePermission("ikp:report");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const patientId = str(body?.patientId);
  const unit = str(body?.unit);
  const onsetDate = str(body?.onsetDate);
  if (!patientId || !unit || !onsetDate) {
    return NextResponse.json({ error: "Pasien, unit, dan tanggal onset wajib diisi" }, { status: 400 });
  }
  if (!isHaiType(body?.haiType)) {
    return NextResponse.json({ error: "Jenis HAI tidak valid" }, { status: 400 });
  }
  if (Number.isNaN(Date.parse(onsetDate))) {
    return NextResponse.json({ error: "Tanggal onset tidak valid" }, { status: 400 });
  }
  const c = await recordCase(guard.session.company.id, {
    patientId, haiType: body.haiType, unit, onsetDate, note: str(body?.note) || null,
    createdBy: guard.session.user.id,
  });
  return NextResponse.json(c, { status: 201 });
}

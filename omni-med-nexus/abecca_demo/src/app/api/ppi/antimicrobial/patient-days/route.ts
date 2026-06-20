import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { recordPatientDays } from "@/server/ppi/antimicrobial";

export const dynamic = "force-dynamic";

const PERIOD_RE = /^\d{4}-\d{2}$/;

export async function POST(request: Request) {
  const guard = await requirePermission("ikp:report");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const period = typeof body?.period === "string" ? body.period.trim() : "";
  if (!PERIOD_RE.test(period)) return NextResponse.json({ error: "Periode (YYYY-MM) wajib" }, { status: 400 });
  const patientDays = Number(body?.patientDays);
  if (!Number.isFinite(patientDays) || patientDays < 0) {
    return NextResponse.json({ error: "Hari-pasien tidak valid" }, { status: 400 });
  }
  await recordPatientDays(guard.session.company.id, { period, patientDays });
  return NextResponse.json({ ok: true });
}

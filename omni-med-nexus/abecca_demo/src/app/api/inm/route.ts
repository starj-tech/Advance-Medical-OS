import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { inmReport, recordInmEntry } from "@/server/quality/inm";
import { isInmCode } from "@/lib/inm";

export const dynamic = "force-dynamic";

const thisMonth = () => new Date().toISOString().slice(0, 7);

/** The 13-indicator report for a period (?period=YYYY-MM, default current month). */
export async function GET(request: Request) {
  const guard = await requirePermission("ikp:read");
  if (guard.error) return guard.error;
  const period = new URL(request.url).searchParams.get("period") || thisMonth();
  return NextResponse.json({ period, indicators: await inmReport(guard.session.company.id, period) });
}

/** Record (upsert) one indicator's numerator/denominator for a period. */
export async function POST(request: Request) {
  const guard = await requirePermission("ikp:report");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const period = typeof body?.period === "string" ? body.period.trim() : "";
  const numerator = Number(body?.numerator);
  const denominator = Number(body?.denominator);
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "Periode harus format YYYY-MM" }, { status: 400 });
  }
  if (!isInmCode(body?.code)) {
    return NextResponse.json({ error: "Kode indikator tidak dikenal" }, { status: 400 });
  }
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || numerator < 0 || denominator < 0) {
    return NextResponse.json({ error: "Numerator & denominator harus angka ≥ 0" }, { status: 400 });
  }
  const entry = await recordInmEntry(guard.session.company.id, {
    period, code: body.code, numerator, denominator,
    note: typeof body?.note === "string" && body.note.trim() ? body.note.trim() : null,
    createdBy: guard.session.user.id,
  });
  return NextResponse.json(entry, { status: 201 });
}

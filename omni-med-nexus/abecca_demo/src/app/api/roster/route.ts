import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createShift, listShifts, rosterSummary } from "@/server/hr/rostering";
import { isShiftType } from "@/lib/rostering";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const addDays = (date: string, n: number): string =>
  new Date(new Date(`${date}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

export async function GET(request: Request) {
  const guard = await requirePermission("user:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const sp = new URL(request.url).searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const from = DATE_RE.test(sp.get("from") ?? "") ? sp.get("from")! : today;
  const to = DATE_RE.test(sp.get("to") ?? "") ? sp.get("to")! : addDays(from, 6);
  const [shifts, summary] = await Promise.all([
    listShifts(companyId, { from, to }),
    rosterSummary(companyId, { from, to }),
  ]);
  return NextResponse.json({ from, to, shifts, summary });
}

export async function POST(request: Request) {
  const guard = await requirePermission("user:manage");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const staffName = str(body?.staffName);
  const unit = str(body?.unit);
  const date = str(body?.date);
  if (!staffName || !unit) return NextResponse.json({ error: "Nama staf dan unit wajib diisi" }, { status: 400 });
  if (!DATE_RE.test(date)) return NextResponse.json({ error: "Tanggal (YYYY-MM-DD) wajib" }, { status: 400 });
  if (!isShiftType(body?.shiftType)) return NextResponse.json({ error: "Jenis shift tidak valid" }, { status: 400 });

  const result = await createShift(guard.session.company.id, {
    staffName, unit, shiftType: body.shiftType, date, notes: str(body?.notes) || null,
  });
  if (!result.ok) {
    return NextResponse.json({ error: `${staffName} sudah memiliki shift pada ${date}` }, { status: 409 });
  }
  return NextResponse.json(result.shift, { status: 201 });
}

import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { listConsumption, recordConsumption } from "@/server/ppi/antimicrobial";
import { isAntibioticCode } from "@/lib/antimicrobial";

export const dynamic = "force-dynamic";

const PERIOD_RE = /^\d{4}-\d{2}$/;
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET(request: Request) {
  const guard = await requirePermission("ikp:read");
  if (guard.error) return guard.error;
  const period = new URL(request.url).searchParams.get("period") || "";
  if (!PERIOD_RE.test(period)) return NextResponse.json({ error: "Periode (YYYY-MM) wajib" }, { status: 400 });
  return NextResponse.json(await listConsumption(guard.session.company.id, period));
}

export async function POST(request: Request) {
  const guard = await requirePermission("ikp:report");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const period = str(body?.period);
  if (!PERIOD_RE.test(period)) return NextResponse.json({ error: "Periode (YYYY-MM) wajib" }, { status: 400 });
  if (!isAntibioticCode(body?.drugCode)) return NextResponse.json({ error: "Antibiotik tidak dikenal" }, { status: 400 });
  const consumedGrams = Number(body?.consumedGrams);
  if (!Number.isFinite(consumedGrams) || consumedGrams <= 0) {
    return NextResponse.json({ error: "Jumlah konsumsi (gram) harus > 0" }, { status: 400 });
  }
  const row = await recordConsumption(guard.session.company.id, { period, drugCode: body.drugCode, consumedGrams });
  return NextResponse.json(row, { status: 201 });
}

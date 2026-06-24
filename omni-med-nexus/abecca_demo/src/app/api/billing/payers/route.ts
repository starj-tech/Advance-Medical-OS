import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createPayer, listPayers } from "@/server/billing/payers";
import { isPayerType, isClaimScheme, isEligibility } from "@/lib/payers";
import { isCurrency } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET(request: Request) {
  const guard = await requirePermission("billing:read");
  if (guard.error) return guard.error;
  const activeOnly = new URL(request.url).searchParams.get("active") === "1";
  const payers = await listPayers(guard.session.company.id, { activeOnly });
  return NextResponse.json({ payers });
}

export async function POST(request: Request) {
  const guard = await requirePermission("billing:manage");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const name = str(body?.name);
  if (!name) return NextResponse.json({ error: "Nama penjamin wajib diisi" }, { status: 400 });
  if (!isPayerType(body?.payerType)) return NextResponse.json({ error: "Jenis penjamin tidak valid" }, { status: 400 });
  if (!isClaimScheme(body?.scheme)) return NextResponse.json({ error: "Skema klaim tidak valid" }, { status: 400 });
  if (!isCurrency(body?.currency)) return NextResponse.json({ error: "Mata uang tidak valid" }, { status: 400 });
  const coveragePercent = Number(body?.coveragePercent);
  if (!Number.isFinite(coveragePercent) || coveragePercent < 0 || coveragePercent > 100) {
    return NextResponse.json({ error: "Persentase tanggungan harus 0–100" }, { status: 400 });
  }
  const eligibilityStatus = isEligibility(body?.eligibilityStatus) ? body.eligibilityStatus : "unknown";
  const ceilingRaw = body?.ceiling;
  const ceiling = ceilingRaw === null || ceilingRaw === undefined || ceilingRaw === "" ? null : Number(ceilingRaw);
  if (ceiling != null && (!Number.isFinite(ceiling) || ceiling < 0)) {
    return NextResponse.json({ error: "Plafon tidak valid" }, { status: 400 });
  }
  const payer = await createPayer(guard.session.company.id, {
    name, payerType: body.payerType, scheme: body.scheme, currency: body.currency,
    coveragePercent, deductible: Number(body?.deductible) || 0, copay: Number(body?.copay) || 0,
    ceiling, eligibilityStatus, createdBy: guard.session.user.id,
  });
  return NextResponse.json(payer, { status: 201 });
}

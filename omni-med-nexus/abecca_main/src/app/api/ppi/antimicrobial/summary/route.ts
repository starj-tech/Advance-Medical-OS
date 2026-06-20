import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { antimicrobialSummary } from "@/server/ppi/antimicrobial";

export const dynamic = "force-dynamic";

const PERIOD_RE = /^\d{4}-\d{2}$/;

export async function GET(request: Request) {
  const guard = await requirePermission("ikp:read");
  if (guard.error) return guard.error;
  const period = new URL(request.url).searchParams.get("period") || "";
  if (!PERIOD_RE.test(period)) return NextResponse.json({ error: "Periode (YYYY-MM) wajib" }, { status: 400 });
  return NextResponse.json(await antimicrobialSummary(guard.session.company.id, period));
}

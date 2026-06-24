import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { buildRiskRegister } from "@/server/analytics/risk";

export const dynamic = "force-dynamic";

/** Predictive risk worklist — restricted to analytics:read (executive/manager). */
export async function GET() {
  const guard = await requirePermission("analytics:read");
  if (guard.error) return guard.error;
  return NextResponse.json(await buildRiskRegister(guard.session.company.id));
}

import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { buildOverview } from "@/server/analytics/overview";

export const dynamic = "force-dynamic";

/** Executive KPI roll-up — restricted to analytics:read (executive/manager). */
export async function GET() {
  const guard = await requirePermission("analytics:read");
  if (guard.error) return guard.error;
  return NextResponse.json(await buildOverview(guard.session.company.id));
}

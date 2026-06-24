import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { eventMetrics } from "@/server/observability/log";

export const dynamic = "force-dynamic";

/** Roll-up of recent events for the tenant — level/scope counts + error rate. */
export async function GET() {
  const guard = await requirePermission("audit:read");
  if (guard.error) return guard.error;
  return NextResponse.json(await eventMetrics(guard.session.company.id));
}

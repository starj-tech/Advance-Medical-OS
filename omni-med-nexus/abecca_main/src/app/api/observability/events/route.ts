import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { listEvents } from "@/server/observability/log";
import { isEventLevel } from "@/lib/observability";

export const dynamic = "force-dynamic";

/** Recent structured events for the tenant (filterable by level/scope). */
export async function GET(request: Request) {
  const guard = await requirePermission("audit:read");
  if (guard.error) return guard.error;
  const params = new URL(request.url).searchParams;
  const level = params.get("level");
  const scope = params.get("scope");
  return NextResponse.json(
    await listEvents(guard.session.company.id, {
      level: isEventLevel(level) ? level : undefined,
      scope: scope || undefined,
    }),
  );
}

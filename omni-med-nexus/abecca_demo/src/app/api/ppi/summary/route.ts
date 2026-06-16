import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { surveillanceSummary } from "@/server/ppi/surveillance";

export const dynamic = "force-dynamic";

/** Incidence density per HAI type, optionally scoped to one period (?period=YYYY-MM). */
export async function GET(request: Request) {
  const guard = await requirePermission("ikp:read");
  if (guard.error) return guard.error;
  const period = new URL(request.url).searchParams.get("period") || undefined;
  return NextResponse.json(await surveillanceSummary(guard.session.company.id, period));
}

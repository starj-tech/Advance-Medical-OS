import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { listDueFollowUps, listUpcomingFollowUps } from "@/server/clinical/follow-ups";

export const dynamic = "force-dynamic";

const today = (): string => new Date().toISOString().slice(0, 10);

/** Front-desk recall worklist: reminders due today (or overdue) + all upcoming. */
export async function GET() {
  const guard = await requirePermission("registration:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const [due, upcoming] = await Promise.all([
    listDueFollowUps(companyId, today()),
    listUpcomingFollowUps(companyId),
  ]);
  return NextResponse.json({ due, upcoming });
}

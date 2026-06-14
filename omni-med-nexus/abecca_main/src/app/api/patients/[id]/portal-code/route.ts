import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { hasPortalCode, issuePortalCode } from "@/server/portal/access";

export const dynamic = "force-dynamic";

/** Whether this patient already has a portal access code (staff view). */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("registration:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  return NextResponse.json({ issued: await hasPortalCode(guard.session.company.id, id) });
}

/** Issue (or re-issue) a one-time-display portal access code for the patient. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("registration:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const code = await issuePortalCode(guard.session.company.id, id, guard.session.user.id);
  return NextResponse.json({ code }, { status: 201 });
}

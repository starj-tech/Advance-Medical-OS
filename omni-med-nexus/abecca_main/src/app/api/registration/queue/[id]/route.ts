import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { QUEUE_STATUSES, setTicketStatus, type QueueStatus } from "@/server/registration/queue";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("registration:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;

  const body = await request.json();
  const status = body?.status as QueueStatus;
  if (!QUEUE_STATUSES.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const ticket = await setTicketStatus(guard.session.company.id, id, status);
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  return NextResponse.json(ticket);
}

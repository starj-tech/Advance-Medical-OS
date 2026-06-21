import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { updateTicket } from "@/server/it/helpdesk";
import { isTicketStatus } from "@/lib/helpdesk";

export const dynamic = "force-dynamic";

/** Advance status (first move off "open" logs the response), assign, or record a resolution. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("device:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const patch: { status?: "open" | "in_progress" | "resolved" | "closed"; assignedTo?: string | null; resolution?: string | null } = {};
  if (body?.status !== undefined) {
    if (!isTicketStatus(body.status)) return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    patch.status = body.status;
  }
  if (typeof body?.assignedTo === "string") patch.assignedTo = body.assignedTo.trim() || null;
  if (typeof body?.resolution === "string") patch.resolution = body.resolution.trim() || null;

  const t = await updateTicket(guard.session.company.id, id, patch);
  if (!t) return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
  return NextResponse.json(t);
}

import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { updateComplaint } from "@/server/quality/complaints";
import { isComplaintStatus } from "@/lib/complaints";

export const dynamic = "force-dynamic";

/** Advance status, assign, or record a resolution. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("ikp:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const patch: { status?: "open" | "in_progress" | "resolved" | "closed"; assignedTo?: string | null; resolution?: string | null } = {};
  if (body?.status !== undefined) {
    if (!isComplaintStatus(body.status)) return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    patch.status = body.status;
  }
  if (typeof body?.assignedTo === "string") patch.assignedTo = body.assignedTo.trim() || null;
  if (typeof body?.resolution === "string") patch.resolution = body.resolution.trim() || null;

  const c = await updateComplaint(guard.session.company.id, id, patch);
  if (!c) return NextResponse.json({ error: "Keluhan tidak ditemukan" }, { status: 404 });
  return NextResponse.json(c);
}

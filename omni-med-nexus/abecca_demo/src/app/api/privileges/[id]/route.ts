import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { updatePrivilege } from "@/server/hr/privileging";
import { isPrivilegeStatus } from "@/lib/privileging";

export const dynamic = "force-dynamic";

/** Advance the privilege lifecycle (grant/suspend), set the review date, or note. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("user:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const patch: { status?: "requested" | "granted" | "suspended" | "expired"; reviewBy?: string | null; notes?: string | null } = {};
  if (body?.status !== undefined) {
    if (!isPrivilegeStatus(body.status)) return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    patch.status = body.status;
  }
  if (typeof body?.reviewBy === "string") {
    const rb = body.reviewBy.trim();
    if (rb && Number.isNaN(Date.parse(rb))) return NextResponse.json({ error: "Tanggal tinjauan tidak valid" }, { status: 400 });
    patch.reviewBy = rb || null;
  }
  if (typeof body?.notes === "string") patch.notes = body.notes.trim() || null;

  const p = await updatePrivilege(guard.session.company.id, id, patch);
  if (!p) return NextResponse.json({ error: "Kewenangan tidak ditemukan" }, { status: 404 });
  return NextResponse.json(p);
}

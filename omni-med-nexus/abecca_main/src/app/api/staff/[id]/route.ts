import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { updateStaff } from "@/server/hr/staff-directory";
import { isStaffStatus } from "@/lib/staff-directory";

export const dynamic = "force-dynamic";

/** Update employment status or contact details. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("user:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const patch: { status?: "active" | "on_leave" | "inactive"; unit?: string | null; phone?: string | null; email?: string | null } = {};
  if (body?.status !== undefined) {
    if (!isStaffStatus(body.status)) return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    patch.status = body.status;
  }
  if (typeof body?.unit === "string") patch.unit = body.unit.trim() || null;
  if (typeof body?.phone === "string") patch.phone = body.phone.trim() || null;
  if (typeof body?.email === "string") patch.email = body.email.trim() || null;

  const s = await updateStaff(guard.session.company.id, id, patch);
  if (!s) return NextResponse.json({ error: "Staf tidak ditemukan" }, { status: 404 });
  return NextResponse.json(s);
}

import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { deleteShift } from "@/server/hr/rostering";

export const dynamic = "force-dynamic";

/** Remove a shift assignment from the roster. */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("user:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const ok = await deleteShift(guard.session.company.id, id);
  if (!ok) return NextResponse.json({ error: "Shift tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

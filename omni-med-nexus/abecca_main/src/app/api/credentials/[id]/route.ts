import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { deleteCredential } from "@/server/hr/credentials";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("user:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const ok = await deleteCredential(guard.session.company.id, id);
  if (!ok) return NextResponse.json({ error: "Kredensial tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

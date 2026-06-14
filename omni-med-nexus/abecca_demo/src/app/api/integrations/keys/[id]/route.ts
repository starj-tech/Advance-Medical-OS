import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { revokeApiKey } from "@/server/integrations/api-keys";

export const dynamic = "force-dynamic";

/** Revoke an API key (irreversible). */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("integration:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const ok = await revokeApiKey(guard.session.company.id, id);
  if (!ok) return NextResponse.json({ error: "Key not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

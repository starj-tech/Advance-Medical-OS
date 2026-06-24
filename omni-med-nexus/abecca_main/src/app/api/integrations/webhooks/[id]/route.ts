import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { deleteWebhook } from "@/server/integrations/webhooks";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("integration:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const ok = await deleteWebhook(guard.session.company.id, id);
  if (!ok) return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

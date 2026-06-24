import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { testWebhook } from "@/server/integrations/webhooks";

export const dynamic = "force-dynamic";

/** Fire a one-off signed `ping` delivery to verify the endpoint is reachable. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("integration:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const result = await testWebhook(guard.session.company.id, id);
  if ("error" in result) return NextResponse.json(result, { status: 404 });
  return NextResponse.json(result);
}

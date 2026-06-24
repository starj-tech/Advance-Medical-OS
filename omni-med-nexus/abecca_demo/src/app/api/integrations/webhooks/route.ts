import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { listWebhooks, registerWebhook } from "@/server/integrations/webhooks";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("integration:manage");
  if (guard.error) return guard.error;
  return NextResponse.json(await listWebhooks(guard.session.company.id));
}

/** Register a webhook endpoint. The signing secret is returned ONCE here. */
export async function POST(request: Request) {
  const guard = await requirePermission("integration:manage");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const result = await registerWebhook(guard.session.company.id, { url: body?.url, events: body?.events });
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}

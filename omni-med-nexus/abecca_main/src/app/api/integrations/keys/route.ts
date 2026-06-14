import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { issueApiKey, listApiKeys } from "@/server/integrations/api-keys";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("integration:manage");
  if (guard.error) return guard.error;
  return NextResponse.json(await listApiKeys(guard.session.company.id));
}

/** Issue a new API key. The plaintext is returned ONCE in this response. */
export async function POST(request: Request) {
  const guard = await requirePermission("integration:manage");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const label = typeof body?.label === "string" && body.label.trim() ? body.label.trim().slice(0, 80) : "API key";
  const { key, view } = await issueApiKey(guard.session.company.id, label, guard.session.user.id);
  return NextResponse.json({ key, view }, { status: 201 });
}

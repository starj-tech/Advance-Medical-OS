import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { listNotifications, markRead } from "@/server/notify/center";

export const dynamic = "force-dynamic";

/** Current user's in-app notification feed. */
export async function GET() {
  const guard = await requirePermission("notification:read");
  if (guard.error) return guard.error;
  const items = await listNotifications(guard.session.company.id, guard.session.user.id);
  return NextResponse.json(items);
}

/** Mark one notification read (body.id) or all (no id). */
export async function PATCH(request: Request) {
  const guard = await requirePermission("notification:read");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  await markRead(guard.session.company.id, guard.session.user.id, body?.id);
  return NextResponse.json({ ok: true });
}

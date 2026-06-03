import { NextResponse } from "next/server";
import { destroySession } from "@/server/auth/store";
import { clearSessionCookie, readSessionToken } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const token = await readSessionToken();
  if (token) await destroySession(token);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

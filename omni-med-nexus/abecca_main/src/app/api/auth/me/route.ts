import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/store";
import { readSessionToken } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/** Current session: the authenticated user + their company, or 401. */
export async function GET() {
  const token = await readSessionToken();
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const session = await getSessionUser(token);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return NextResponse.json(session);
}

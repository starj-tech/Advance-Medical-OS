import { NextResponse } from "next/server";
import {
  confirmMfaEnrollment,
  disableMfa,
  getMfaStatus,
  getSessionUser,
  startMfaEnrollment,
} from "@/server/auth/store";
import { readSessionToken } from "@/server/auth/session";
import { otpauthUrl } from "@/lib/totp";

export const dynamic = "force-dynamic";

/** Resolve the signed-in user from the session cookie, or null. */
async function currentSession() {
  const token = await readSessionToken();
  if (!token) return null;
  return (await getSessionUser(token)) ?? null;
}

export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return NextResponse.json(await getMfaStatus(session.user.companyId, session.user.id));
}

/**
 * Self-service MFA: { action: "setup" | "enable" | "disable", code? }.
 */
export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { user, company } = session;
  const body = await request.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (action === "setup") {
    const secret = await startMfaEnrollment(user.companyId, user.id);
    if (!secret) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({
      secret,
      otpauthUrl: otpauthUrl({ secret, label: user.email, issuer: `Abecca IT ${company.companyCode}` }),
    });
  }
  if (action === "enable") {
    if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });
    const ok = await confirmMfaEnrollment(user.companyId, user.id, code);
    if (!ok) return NextResponse.json({ error: "Kode tidak valid. Pastikan jam perangkat sinkron." }, { status: 400 });
    return NextResponse.json({ enabled: true });
  }
  if (action === "disable") {
    if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });
    const ok = await disableMfa(user.companyId, user.id, code);
    if (!ok) return NextResponse.json({ error: "Kode tidak valid" }, { status: 400 });
    return NextResponse.json({ enabled: false });
  }
  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}

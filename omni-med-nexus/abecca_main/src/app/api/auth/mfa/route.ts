import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import {
  confirmMfaEnrollment,
  disableMfa,
  getMfaStatus,
  startMfaEnrollment,
} from "@/server/auth/store";
import { otpauthUrl } from "@/lib/totp";

export const dynamic = "force-dynamic";

/** Current MFA status for the signed-in user. */
export async function GET() {
  const guard = await requireUser();
  if (guard.error) return guard.error;
  const { user } = guard.session;
  return NextResponse.json(await getMfaStatus(user.companyId, user.id));
}

/**
 * Self-service MFA management for the signed-in user:
 *   { action: "setup" }            → start enrollment, returns secret + otpauth URI
 *   { action: "enable", code }     → activate once a valid code is proven
 *   { action: "disable", code }    → deactivate with a valid current code
 */
export async function POST(request: Request) {
  const guard = await requireUser();
  if (guard.error) return guard.error;
  const { user, company } = guard.session;
  const body = await request.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (action === "setup") {
    const secret = await startMfaEnrollment(user.companyId, user.id);
    if (!secret) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({
      secret,
      otpauthUrl: otpauthUrl({ secret, label: user.email, issuer: `Abecca ${company.companyCode}` }),
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

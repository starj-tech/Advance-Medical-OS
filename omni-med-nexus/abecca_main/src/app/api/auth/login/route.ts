import { NextResponse } from "next/server";
import { authenticate, createSession, verifyMfaCode } from "@/server/auth/store";
import { setSessionCookie } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/**
 * Login with Company ID (company_code) + email + password. If the account has a
 * TOTP second factor enrolled, the first call returns `{ mfaRequired: true }`
 * (no session yet); the client re-submits the same credentials plus `code`. The
 * password is re-verified on the second call, so possession of step one alone
 * grants nothing.
 */
export async function POST(request: Request) {
  const { companyCode, email, password, code } = await request.json();
  if (!companyCode || !email || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }
  const user = await authenticate(String(companyCode), String(email), String(password));
  if (!user) {
    return NextResponse.json(
      { error: "Invalid Company ID, email or password" },
      { status: 401 },
    );
  }

  if (user.mfaEnabled) {
    const otp = typeof code === "string" ? code.trim() : "";
    if (!otp) {
      return NextResponse.json({ mfaRequired: true });
    }
    if (!(await verifyMfaCode(user.companyId, user.id, otp))) {
      return NextResponse.json(
        { error: "Kode autentikasi (2FA) salah", mfaRequired: true },
        { status: 401 },
      );
    }
  }

  const { token, expiresAt } = await createSession(user);
  await setSessionCookie(token, expiresAt);
  return NextResponse.json({ user });
}

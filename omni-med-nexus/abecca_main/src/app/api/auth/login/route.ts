import { NextResponse } from "next/server";
import { authenticate, createSession } from "@/server/auth/store";
import { setSessionCookie } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/** Login with Company ID (company_code) + email + password. */
export async function POST(request: Request) {
  const { companyCode, email, password } = await request.json();
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
  const { token, expiresAt } = await createSession(user);
  await setSessionCookie(token, expiresAt);
  return NextResponse.json({ user });
}

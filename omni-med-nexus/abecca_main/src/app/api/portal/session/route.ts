import { NextResponse } from "next/server";
import { getCompanyByCode } from "@/server/auth/store";
import {
  createPortalSession,
  getPortalSession,
  readPortalToken,
  revokePortalSession,
  setPortalCookie,
  verifyPortalCode,
  clearPortalCookie,
} from "@/server/portal/access";
import { enforceRateLimit } from "@/server/security/rate-limit";
import { RATE_RULES } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Patient portal login: Company ID + No. RM + access code. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const companyCode = str(body?.companyCode);
  const patientId = str(body?.patientId);
  const code = str(body?.code);
  if (!companyCode || !patientId || !code) {
    return NextResponse.json({ error: "Company ID, No. RM, dan kode akses wajib diisi" }, { status: 400 });
  }

  // One generic failure for any wrong field — don't reveal which part was wrong.
  const company = await getCompanyByCode(companyCode);

  // Throttle per portal account to blunt access-code guessing.
  const limited = await enforceRateLimit(
    `portal:${companyCode.toLowerCase()}:${patientId.toLowerCase()}`,
    RATE_RULES.portalLogin,
    { action: "portal_login", companyId: company?.id ?? null },
  );
  if (limited) return limited;

  const ok = company && (await verifyPortalCode(company.id, patientId, code));
  if (!company || !ok) {
    return NextResponse.json({ error: "Kredensial portal tidak valid" }, { status: 401 });
  }

  const { token, expiresAt } = await createPortalSession(company.id, patientId);
  await setPortalCookie(token, expiresAt);
  return NextResponse.json({ ok: true, patientId });
}

/** Current portal identity (used by the portal page to stay signed in). */
export async function GET() {
  const token = await readPortalToken();
  const identity = token ? await getPortalSession(token) : undefined;
  if (!identity) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return NextResponse.json({ patientId: identity.patientId });
}

/** Portal logout. */
export async function DELETE() {
  const token = await readPortalToken();
  if (token) await revokePortalSession(token);
  await clearPortalCookie();
  return NextResponse.json({ ok: true });
}

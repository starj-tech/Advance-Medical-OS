/**
 * Server-side authorization guards for route handlers.
 *
 * Usage in a route:
 *   const guard = await requirePermission("patient:read");
 *   if (guard.error) return guard.error;
 *   const { session } = guard; // session.user, session.company
 *
 * Authentication is the session cookie (server/auth/session.ts); authorization
 * is the permission matrix (lib/permissions.ts). The middleware already blocks
 * unauthenticated page navigation — this adds per-action authorization to APIs.
 */
import { NextResponse } from "next/server";
import { getSessionUser, type AuthUser, type Company } from "./store";
import { readSessionToken } from "./session";
import { hasPermission, type Permission } from "@/lib/permissions";
import { logEvent } from "@/server/observability/log";

export interface Session {
  user: AuthUser;
  company: Company;
}

type Guarded =
  | { session: Session; error?: undefined }
  | { session?: undefined; error: NextResponse };

export async function getSession(): Promise<Session | undefined> {
  const token = await readSessionToken();
  if (!token) return undefined;
  return getSessionUser(token);
}

export async function requireUser(): Promise<Guarded> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  return { session };
}

export async function requirePermission(perm: Permission): Promise<Guarded> {
  const r = await requireUser();
  if (r.error) return r;
  if (!hasPermission(r.session.user, perm)) {
    // Authorization denials are a high-value security signal — record one
    // (best-effort; logEvent never throws, so this can't break the guard).
    await logEvent({
      level: "warn",
      scope: "authz",
      message: `Akses ditolak (${perm})`,
      companyId: r.session.company.id,
      userId: r.session.user.id,
      fields: { permission: perm, subRole: r.session.user.subRole },
    });
    return {
      error: NextResponse.json({ error: "Forbidden", permission: perm }, { status: 403 }),
    };
  }
  return r;
}

/**
 * Authorization guards for the Abecca DEMO app.
 *
 * There is no authentication here — every request runs as the synthetic demo
 * session whose role comes from the `demo-role` cookie (server/auth/demo-session).
 * `requirePermission` still consults the permission matrix, so picking a narrow
 * role (e.g. Kasir) realistically hides actions that role can't perform — which
 * is exactly the RBAC behaviour we want to showcase. It just never 401s, since
 * the demo is always "signed in" as the chosen persona.
 */
import { NextResponse } from "next/server";
import type { AuthUser, Company } from "./store";
import { getDemoSession } from "./demo-session";
import { hasPermission, type Permission } from "@/lib/permissions";

export interface Session {
  user: AuthUser;
  company: Company;
}

type Guarded =
  | { session: Session; error?: undefined }
  | { session?: undefined; error: NextResponse };

export async function getSession(): Promise<Session | undefined> {
  return getDemoSession();
}

export async function requireUser(): Promise<Guarded> {
  return { session: await getDemoSession() };
}

export async function requirePermission(perm: Permission): Promise<Guarded> {
  const session = await getDemoSession();
  if (!hasPermission(session.user, perm)) {
    return {
      error: NextResponse.json({ error: "Forbidden", permission: perm }, { status: 403 }),
    };
  }
  return { session };
}

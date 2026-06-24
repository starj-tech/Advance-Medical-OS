/**
 * Synthetic session for the Abecca Demo app — there is NO login here. The visitor
 * picks a role (stored in the `demo-role` cookie); this turns that into a full
 * { user, company } session so the guard, <Can> gate and topbar all behave as if
 * that persona were signed in. Default role is the Direktur Utama (sees
 * everything). All data is the shared in-memory demo tenant.
 */
import { cookies } from "next/headers";
import type { AuthUser, Company } from "./store";
import { DEMO_ROLE_COOKIE, demoRoleByKey } from "@/lib/demo-roles";

export const DEMO_COMPANY_ID = "demo-co";

const DEMO_COMPANY: Company = {
  id: DEMO_COMPANY_ID,
  companyCode: "ABECCA-DEMO",
  legalName: "RS Abecca Demo",
  picEmail: "demo@abecca.id",
  plan: "enterprise",
  status: "active",
  stripeCustomerId: null,
  stripeSubscriptionId: null,
};

export interface DemoSession {
  user: AuthUser;
  company: Company;
}

export async function getDemoSession(): Promise<DemoSession> {
  const key = (await cookies()).get(DEMO_ROLE_COOKIE)?.value;
  const role = demoRoleByKey(key);
  const user: AuthUser = {
    id: `demo-user-${role.key}`,
    companyId: DEMO_COMPANY_ID,
    fullName: role.fullName,
    email: `${role.key}@abecca.demo`,
    roleTier: role.roleTier,
    subRole: role.subRole,
    isCompanyAdmin: role.isCompanyAdmin,
    status: "active",
  };
  return { user, company: DEMO_COMPANY };
}

/**
 * Shared-auth store for the Abecca IT app — reads the SAME companies / users /
 * sessions tables as the main app (one identity across the suite). Login only;
 * registration & provisioning live in the main app.
 *
 * Session tokens are hashed identically to main (sha256) and use the same
 * cookie, so a session created in one app is valid in the other when both point
 * at the same Supabase project and share a cookie domain (production). Env-gated:
 * without Supabase there is no shared identity store, so authenticate() returns
 * undefined (standalone preview cannot log in — by design).
 */
import { createHash, randomBytes } from "node:crypto";
import { getSupabase } from "../supabase";
import { hashPassword, verifyPassword } from "./password";

export type RoleTier = "executive" | "manager" | "doctor" | "staff";

export interface AuthUser {
  id: string;
  companyId: string;
  fullName: string;
  email: string;
  roleTier: RoleTier;
  subRole: string;
  isCompanyAdmin: boolean;
  status: string;
}

export interface Company {
  id: string;
  companyCode: string;
  legalName: string;
  plan: string;
  status: string;
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function genToken(): string {
  return randomBytes(32).toString("base64url");
}
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

interface UserRow {
  id: string;
  company_id: string;
  full_name: string;
  email: string;
  role_tier: RoleTier;
  sub_role: string;
  password_hash: string | null;
  is_company_admin: boolean;
  status: string;
}
interface CompanyRow {
  id: string;
  company_code: string;
  legal_name: string;
  plan: string;
  status: string;
}

function rowToUser(r: UserRow): AuthUser {
  return {
    id: r.id,
    companyId: r.company_id,
    fullName: r.full_name,
    email: r.email,
    roleTier: r.role_tier,
    subRole: r.sub_role,
    isCompanyAdmin: r.is_company_admin,
    status: r.status,
  };
}
function toCompany(r: CompanyRow): Company {
  return { id: r.id, companyCode: r.company_code, legalName: r.legal_name, plan: r.plan, status: r.status };
}

/* --------------------------- in-memory backend ---------------------------- */
// Standalone preview (no Supabase): a seeded in-memory identity store so the IT
// app has working demo accounts without the shared database. Mirrors the main
// app's demo seed (same Company ID + password).
type ItMem = {
  companies: Map<string, Company>;
  codeToId: Map<string, string>;
  users: UserRow[];
  sessions: Map<string, { userId: string; companyId: string; expiresAt: number }>;
};
const g = globalThis as unknown as { __abeccaItAuth?: ItMem };
const mem: ItMem =
  g.__abeccaItAuth ??
  (g.__abeccaItAuth = {
    companies: new Map(),
    codeToId: new Map(),
    users: [],
    sessions: new Map(),
  });

export const DEMO_COMPANY_CODE = "ABECCA-DEMO";
export const DEMO_PASSWORD = "AbeccaDemo123!";

function seedDemo(): void {
  if (mem.codeToId.has(DEMO_COMPANY_CODE)) return;
  const companyId = "demo-company-0001";
  mem.companies.set(companyId, {
    id: companyId,
    companyCode: DEMO_COMPANY_CODE,
    legalName: "RS Abecca Demo",
    plan: "enterprise",
    status: "active",
  });
  mem.codeToId.set(DEMO_COMPANY_CODE, companyId);
  const passwordHash = hashPassword(DEMO_PASSWORD);
  const demoUsers: { email: string; fullName: string; tier: RoleTier; subRole: string; admin: boolean }[] = [
    { email: "cio@abecca.demo", fullName: "Ir. Bayu Nugroho, M.Kom", tier: "executive", subRole: "cio", admin: true },
    { email: "it@abecca.demo", fullName: "Rangga Saputra", tier: "manager", subRole: "mgr-ti", admin: false },
    { email: "teknisi@abecca.demo", fullName: "Yusuf Hidayat", tier: "staff", subRole: "teknisi-ipsrs", admin: false },
  ];
  for (const u of demoUsers) {
    mem.users.push({
      id: crypto.randomUUID(),
      company_id: companyId,
      full_name: u.fullName,
      email: u.email,
      role_tier: u.tier,
      sub_role: u.subRole,
      password_hash: passwordHash,
      is_company_admin: u.admin,
      status: "active",
    });
  }
}
seedDemo();

export async function authenticate(
  companyCode: string,
  email: string,
  password: string,
): Promise<AuthUser | undefined> {
  const sb = getSupabase();
  if (!sb) {
    const companyId = mem.codeToId.get(companyCode);
    if (!companyId) return undefined;
    const row = mem.users.find(
      (u) => u.company_id === companyId && u.email === email.toLowerCase(),
    );
    if (!row || !row.password_hash || row.status !== "active") return undefined;
    if (!verifyPassword(password, row.password_hash)) return undefined;
    return rowToUser(row);
  }
  const { data: company } = await sb
    .from("companies")
    .select("id")
    .eq("company_code", companyCode)
    .maybeSingle();
  if (!company) return undefined;
  const { data: row } = await sb
    .from("users")
    .select("*")
    .eq("company_id", company.id)
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (!row || !row.password_hash || row.status !== "active") return undefined;
  if (!verifyPassword(password, row.password_hash)) return undefined;
  return rowToUser(row as UserRow);
}

export async function createSession(user: AuthUser): Promise<{ token: string; expiresAt: Date }> {
  const token = genToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const sb = getSupabase();
  if (sb) {
    await sb.from("sessions").insert({
      token_hash: hashToken(token),
      user_id: user.id,
      company_id: user.companyId,
      expires_at: expiresAt.toISOString(),
    });
  } else {
    mem.sessions.set(hashToken(token), {
      userId: user.id,
      companyId: user.companyId,
      expiresAt: expiresAt.getTime(),
    });
  }
  return { token, expiresAt };
}

export async function getSessionUser(
  token: string,
): Promise<{ user: AuthUser; company: Company } | undefined> {
  const sb = getSupabase();
  if (!sb) {
    const s = mem.sessions.get(hashToken(token));
    if (!s || s.expiresAt < Date.now()) return undefined;
    const row = mem.users.find((u) => u.id === s.userId);
    const company = mem.companies.get(s.companyId);
    if (!row || !company) return undefined;
    return { user: rowToUser(row), company };
  }
  const { data: s } = await sb
    .from("sessions")
    .select("user_id, company_id, expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!s) return undefined;
  if (new Date(s.expires_at).getTime() < Date.now()) {
    await sb.from("sessions").delete().eq("token_hash", hashToken(token));
    return undefined;
  }
  const { data: row } = await sb.from("users").select("*").eq("id", s.user_id).maybeSingle();
  const { data: company } = await sb.from("companies").select("*").eq("id", s.company_id).maybeSingle();
  if (!row || !company) return undefined;
  return { user: rowToUser(row as UserRow), company: toCompany(company as CompanyRow) };
}

export async function destroySession(token: string): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.from("sessions").delete().eq("token_hash", hashToken(token));
  else mem.sessions.delete(hashToken(token));
}

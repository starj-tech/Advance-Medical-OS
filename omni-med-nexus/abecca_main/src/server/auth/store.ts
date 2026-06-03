/**
 * Auth & tenancy store for the Abecca SaaS.
 *
 * Same env-gated pattern as the rest of the BFF: when SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY are set, companies/users/sessions are read/written
 * in Supabase; otherwise an in-memory process-global singleton is used (preview/
 * dev — resets on restart). The public API is async and identical either way.
 *
 * Login model (locked): Company ID (company_code) + employee email + password.
 * The PIC/registrant is the company admin. Sessions store only the sha256 of the
 * cookie token. Passwords are scrypt-hashed (server/auth/password.ts).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "../supabase";
import { hashPassword, verifyPassword } from "./password";
import {
  generateCompanyCode,
  generateSessionToken,
  generateTempPassword,
  hashToken,
} from "./codes";
import { isValidSubRole, tierOfSubRole, type RoleTier } from "@/lib/rbac";

export type Plan = "starter" | "professional" | "enterprise";

export interface Company {
  id: string;
  companyCode: string;
  legalName: string;
  picEmail: string;
  plan: Plan;
  status: string;
}

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

export interface RegisterInput {
  legalName: string;
  picEmail: string;
  hospitalClass?: string;
  npwp?: string;
  address?: string;
  phone?: string;
  plan?: Plan;
  /** The PIC / company admin (also a user). */
  admin: { fullName: string; email: string; subRole: string };
  /** Additional employees provisioned at registration. */
  employees?: { fullName: string; email: string; subRole: string }[];
}

export interface RegisterResult {
  company: Company;
  /** One-time admin password (emailed in production; returned here for now). */
  adminTempPassword: string;
  employeeCount: number;
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

class RegisterError extends Error {}
export { RegisterError };

/** Resolve each person's tier from their sub-role; throws on an invalid slug. */
function tierForSubRole(subRole: string): RoleTier {
  const tier = tierOfSubRole(subRole);
  if (!tier || !isValidSubRole(subRole)) {
    throw new RegisterError(`Unknown sub_role: ${subRole}`);
  }
  return tier;
}

/* ============================ in-memory backend ============================ */

type Row = {
  id: string;
  company_id: string;
  full_name: string;
  email: string;
  role_tier: RoleTier;
  sub_role: string;
  password_hash: string | null;
  is_company_admin: boolean;
  status: string;
};

type Mem = {
  companies: Map<string, Company>;
  codeToId: Map<string, string>;
  users: Row[];
  sessions: Map<string, { userId: string; companyId: string; expiresAt: number }>;
};

const g = globalThis as unknown as { __abeccaAuth?: Mem };
const mem: Mem =
  g.__abeccaAuth ??
  (g.__abeccaAuth = {
    companies: new Map(),
    codeToId: new Map(),
    users: [],
    sessions: new Map(),
  });

function rowToUser(r: Row): AuthUser {
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

async function uniqueCode(exists: (c: string) => Promise<boolean>, seed: string) {
  for (let i = 0; i < 20; i++) {
    const code = generateCompanyCode(seed);
    if (!(await exists(code))) return code;
  }
  throw new RegisterError("Could not allocate a unique Company ID");
}

const memory = {
  async register(input: RegisterInput): Promise<RegisterResult> {
    const adminTier = tierForSubRole(input.admin.subRole);
    const employees = (input.employees ?? []).map((e) => ({
      ...e,
      tier: tierForSubRole(e.subRole),
    }));

    const code = await uniqueCode(
      async (c) => mem.codeToId.has(c),
      input.legalName,
    );
    const companyId = crypto.randomUUID();
    const company: Company = {
      id: companyId,
      companyCode: code,
      legalName: input.legalName,
      picEmail: input.picEmail,
      plan: input.plan ?? "starter",
      status: "active",
    };
    mem.companies.set(companyId, company);
    mem.codeToId.set(code, companyId);

    const tempPassword = generateTempPassword();
    mem.users.push({
      id: crypto.randomUUID(),
      company_id: companyId,
      full_name: input.admin.fullName,
      email: input.admin.email.toLowerCase(),
      role_tier: adminTier,
      sub_role: input.admin.subRole,
      password_hash: hashPassword(tempPassword),
      is_company_admin: true,
      status: "active",
    });
    for (const e of employees) {
      mem.users.push({
        id: crypto.randomUUID(),
        company_id: companyId,
        full_name: e.fullName,
        email: e.email.toLowerCase(),
        role_tier: e.tier,
        sub_role: e.subRole,
        password_hash: null,
        is_company_admin: false,
        status: "invited",
      });
    }
    return { company, adminTempPassword: tempPassword, employeeCount: employees.length };
  },

  async authenticate(code: string, email: string, password: string) {
    const companyId = mem.codeToId.get(code);
    if (!companyId) return undefined;
    const row = mem.users.find(
      (u) => u.company_id === companyId && u.email === email.toLowerCase(),
    );
    if (!row || !row.password_hash || row.status !== "active") return undefined;
    if (!verifyPassword(password, row.password_hash)) return undefined;
    return rowToUser(row);
  },

  async createSession(user: AuthUser) {
    const token = generateSessionToken();
    const expiresAt = Date.now() + SESSION_TTL_MS;
    mem.sessions.set(hashToken(token), {
      userId: user.id,
      companyId: user.companyId,
      expiresAt,
    });
    return { token, expiresAt: new Date(expiresAt) };
  },

  async sessionUser(token: string) {
    const s = mem.sessions.get(hashToken(token));
    if (!s) return undefined;
    if (s.expiresAt < Date.now()) {
      mem.sessions.delete(hashToken(token));
      return undefined;
    }
    const row = mem.users.find((u) => u.id === s.userId);
    const company = mem.companies.get(s.companyId);
    if (!row || !company) return undefined;
    return { user: rowToUser(row), company };
  },

  async deleteSession(token: string) {
    mem.sessions.delete(hashToken(token));
  },
};

/* ============================= supabase backend =========================== */

function sbCompany(r: {
  id: string;
  company_code: string;
  legal_name: string;
  pic_email: string;
  plan: Plan;
  status: string;
}): Company {
  return {
    id: r.id,
    companyCode: r.company_code,
    legalName: r.legal_name,
    picEmail: r.pic_email,
    plan: r.plan,
    status: r.status,
  };
}

const supa = {
  async register(sb: SupabaseClient, input: RegisterInput): Promise<RegisterResult> {
    const adminTier = tierForSubRole(input.admin.subRole);
    const employees = (input.employees ?? []).map((e) => ({
      ...e,
      tier: tierForSubRole(e.subRole),
    }));

    const code = await uniqueCode(async (c) => {
      const { data } = await sb
        .from("companies")
        .select("id")
        .eq("company_code", c)
        .maybeSingle();
      return !!data;
    }, input.legalName);

    const { data: companyRow, error: cErr } = await sb
      .from("companies")
      .insert({
        company_code: code,
        legal_name: input.legalName,
        hospital_class: input.hospitalClass ?? null,
        npwp: input.npwp ?? null,
        address: input.address ?? null,
        phone: input.phone ?? null,
        pic_email: input.picEmail,
        plan: input.plan ?? "starter",
        status: "active",
      })
      .select("*")
      .single();
    if (cErr || !companyRow) throw new RegisterError(cErr?.message ?? "insert company failed");
    const company = sbCompany(companyRow);

    const tempPassword = generateTempPassword();
    const rows = [
      {
        company_id: company.id,
        full_name: input.admin.fullName,
        email: input.admin.email.toLowerCase(),
        role_tier: adminTier,
        sub_role: input.admin.subRole,
        password_hash: hashPassword(tempPassword),
        is_company_admin: true,
        must_set_password: false,
        status: "active",
      },
      ...employees.map((e) => ({
        company_id: company.id,
        full_name: e.fullName,
        email: e.email.toLowerCase(),
        role_tier: e.tier,
        sub_role: e.subRole,
        password_hash: null,
        is_company_admin: false,
        must_set_password: true,
        status: "invited",
      })),
    ];
    const { error: uErr } = await sb.from("users").insert(rows);
    if (uErr) throw new RegisterError(uErr.message);
    return { company, adminTempPassword: tempPassword, employeeCount: employees.length };
  },

  async authenticate(sb: SupabaseClient, code: string, email: string, password: string) {
    const { data: companyRow } = await sb
      .from("companies")
      .select("*")
      .eq("company_code", code)
      .maybeSingle();
    if (!companyRow) return undefined;
    const { data: row } = await sb
      .from("users")
      .select("*")
      .eq("company_id", companyRow.id)
      .eq("email", email.toLowerCase())
      .maybeSingle();
    if (!row || !row.password_hash || row.status !== "active") return undefined;
    if (!verifyPassword(password, row.password_hash)) return undefined;
    return rowToUser(row as Row);
  },

  async createSession(sb: SupabaseClient, user: AuthUser) {
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await sb.from("sessions").insert({
      token_hash: hashToken(token),
      user_id: user.id,
      company_id: user.companyId,
      expires_at: expiresAt.toISOString(),
    });
    return { token, expiresAt };
  },

  async sessionUser(sb: SupabaseClient, token: string) {
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
    const { data: companyRow } = await sb
      .from("companies")
      .select("*")
      .eq("id", s.company_id)
      .maybeSingle();
    if (!row || !companyRow) return undefined;
    return { user: rowToUser(row as Row), company: sbCompany(companyRow) };
  },

  async deleteSession(sb: SupabaseClient, token: string) {
    await sb.from("sessions").delete().eq("token_hash", hashToken(token));
  },
};

/* ============================== public API ================================ */

export async function registerCompany(input: RegisterInput): Promise<RegisterResult> {
  const sb = getSupabase();
  return sb ? supa.register(sb, input) : memory.register(input);
}

export async function authenticate(
  companyCode: string,
  email: string,
  password: string,
): Promise<AuthUser | undefined> {
  const sb = getSupabase();
  return sb
    ? supa.authenticate(sb, companyCode, email, password)
    : memory.authenticate(companyCode, email, password);
}

export async function createSession(
  user: AuthUser,
): Promise<{ token: string; expiresAt: Date }> {
  const sb = getSupabase();
  return sb ? supa.createSession(sb, user) : memory.createSession(user);
}

export async function getSessionUser(
  token: string,
): Promise<{ user: AuthUser; company: Company } | undefined> {
  const sb = getSupabase();
  return sb ? supa.sessionUser(sb, token) : memory.sessionUser(token);
}

export async function destroySession(token: string): Promise<void> {
  const sb = getSupabase();
  return sb ? supa.deleteSession(sb, token) : memory.deleteSession(token);
}

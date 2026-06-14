/**
 * Patient portal access — a self-service surface separate from the staff login.
 * Front-desk staff issue a one-time-display access code for a patient (scoped to
 * the tenant + patient id); the patient signs in at /portal with Company ID +
 * No. RM + that code. As everywhere else, only the sha256 hash of the code and of
 * the session token is stored, so a data leak can't resurrect either. Tenant-
 * scoped by company_id; env-gated (Supabase or in-memory).
 */
import { cookies } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getSupabase } from "../supabase";

export const PORTAL_COOKIE = "abecca_portal";
const PORTAL_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
function hashesEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
/** Normalise a typed code to its canonical "XXXX-XXXX" form before hashing. */
export function canonicalPortalCode(raw: string): string {
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}
function generatePortalCode(): string {
  const bytes = randomBytes(8);
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

/* ------------------------------- access codes ----------------------------- */

interface AccessRow {
  companyId: string;
  patientId: string;
  codeHash: string;
  issuedBy: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}
const g = globalThis as unknown as {
  __abeccaPortalAccess?: AccessRow[];
  __abeccaPortalSessions?: { tokenHash: string; companyId: string; patientId: string; expiresAt: number }[];
};
const access = g.__abeccaPortalAccess ?? (g.__abeccaPortalAccess = []);
const sessions = g.__abeccaPortalSessions ?? (g.__abeccaPortalSessions = []);

/** Issue (or re-issue) a portal access code for a patient. Returns the plaintext
 *  code ONCE — only its hash is persisted. */
export async function issuePortalCode(
  companyId: string,
  patientId: string,
  issuedBy: string | null,
): Promise<string> {
  const code = generatePortalCode();
  const codeHash = hash(code);
  const sb = getSupabase();
  if (sb) {
    await sb
      .from("portal_access")
      .upsert(
        { company_id: companyId, patient_id: patientId, code_hash: codeHash, issued_by: issuedBy, last_login_at: null },
        { onConflict: "company_id,patient_id" },
      );
    return code;
  }
  const existing = access.find((a) => a.companyId === companyId && a.patientId === patientId);
  if (existing) {
    existing.codeHash = codeHash;
    existing.issuedBy = issuedBy;
    existing.lastLoginAt = null;
  } else {
    access.push({ companyId, patientId, codeHash, issuedBy, createdAt: new Date().toISOString(), lastLoginAt: null });
  }
  return code;
}

/** Whether a patient already has a portal code (so staff can show "issued"). */
export async function hasPortalCode(companyId: string, patientId: string): Promise<boolean> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("portal_access").select("patient_id").eq("company_id", companyId).eq("patient_id", patientId).maybeSingle();
    return !!data;
  }
  return access.some((a) => a.companyId === companyId && a.patientId === patientId);
}

/** Verify a typed code against the stored hash (constant-time). */
export async function verifyPortalCode(
  companyId: string,
  patientId: string,
  code: string,
): Promise<boolean> {
  const codeHash = hash(canonicalPortalCode(code));
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("portal_access").select("code_hash").eq("company_id", companyId).eq("patient_id", patientId).maybeSingle();
    if (!data?.code_hash) return false;
    const ok = hashesEqual(codeHash, data.code_hash as string);
    if (ok) await sb.from("portal_access").update({ last_login_at: new Date().toISOString() }).eq("company_id", companyId).eq("patient_id", patientId);
    return ok;
  }
  const row = access.find((a) => a.companyId === companyId && a.patientId === patientId);
  if (!row) return false;
  const ok = hashesEqual(codeHash, row.codeHash);
  if (ok) row.lastLoginAt = new Date().toISOString();
  return ok;
}

/* ------------------------------ portal sessions --------------------------- */

export interface PortalIdentity {
  companyId: string;
  patientId: string;
}

export async function createPortalSession(
  companyId: string,
  patientId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + PORTAL_SESSION_TTL_MS);
  const sb = getSupabase();
  if (sb) {
    await sb.from("portal_sessions").insert({
      token_hash: hash(token), company_id: companyId, patient_id: patientId, expires_at: expiresAt.toISOString(),
    });
    return { token, expiresAt };
  }
  sessions.push({ tokenHash: hash(token), companyId, patientId, expiresAt: expiresAt.getTime() });
  return { token, expiresAt };
}

export async function getPortalSession(token: string): Promise<PortalIdentity | undefined> {
  const tokenHash = hash(token);
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("portal_sessions").select("company_id, patient_id, expires_at").eq("token_hash", tokenHash).maybeSingle();
    if (!data) return undefined;
    if (new Date(data.expires_at as string).getTime() < Date.now()) {
      await sb.from("portal_sessions").delete().eq("token_hash", tokenHash);
      return undefined;
    }
    return { companyId: data.company_id as string, patientId: data.patient_id as string };
  }
  const s = sessions.find((x) => x.tokenHash === tokenHash);
  if (!s) return undefined;
  if (s.expiresAt < Date.now()) {
    sessions.splice(sessions.indexOf(s), 1);
    return undefined;
  }
  return { companyId: s.companyId, patientId: s.patientId };
}

export async function revokePortalSession(token: string): Promise<void> {
  const tokenHash = hash(token);
  const sb = getSupabase();
  if (sb) {
    await sb.from("portal_sessions").delete().eq("token_hash", tokenHash);
    return;
  }
  const i = sessions.findIndex((x) => x.tokenHash === tokenHash);
  if (i >= 0) sessions.splice(i, 1);
}

/* -------------------------------- cookie I/O ------------------------------ */

export async function setPortalCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(PORTAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}
export async function readPortalToken(): Promise<string | undefined> {
  return (await cookies()).get(PORTAL_COOKIE)?.value;
}
export async function clearPortalCookie(): Promise<void> {
  (await cookies()).delete(PORTAL_COOKIE);
}

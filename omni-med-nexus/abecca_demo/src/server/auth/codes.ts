/**
 * Identifier & secret generation for Abecca auth.
 *
 * - Company ID (company_code): human-readable tenant code shown at login,
 *   e.g. "ABEC-7K2Q9F". Uses an unambiguous alphabet (no 0/O/1/I).
 * - Session token: opaque high-entropy value placed in the cookie; only its
 *   sha256 hash is stored server-side, so a DB leak can't resurrect sessions.
 * - Temp password: one-time secret for the company admin, emailed on
 *   provisioning (employees instead get an invite link to set their own).
 */
import { createHash, randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function generateCompanyCode(prefixSource?: string): string {
  const prefix =
    (prefixSource ?? "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4) || "ABEC";
  const bytes = randomBytes(6);
  let body = "";
  for (let i = 0; i < 6; i++) body += ALPHABET[bytes[i] % ALPHABET.length];
  return `${prefix}-${body}`;
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateTempPassword(): string {
  return randomBytes(9).toString("base64url"); // 12 url-safe chars
}

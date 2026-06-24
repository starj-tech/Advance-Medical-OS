/**
 * Password hashing — identical to the main app (Node scrypt, no native dep) so
 * hashes written by main verify here. Only verification is used in the IT app
 * (passwords are set during provisioning in main), but both are kept for parity.
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, ns, rs, ps, saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  let derived: Buffer;
  try {
    derived = scryptSync(password, salt, expected.length, {
      N: Number(ns),
      r: Number(rs),
      p: Number(ps),
    });
  } catch {
    return false;
  }
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

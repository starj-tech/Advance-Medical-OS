/**
 * RFC 6238 TOTP (time-based one-time password) — the standard second factor for
 * authenticator apps (Google Authenticator, Authy, 1Password, …). Pure Node
 * crypto, no dependencies, so it is fully deterministic and unit-testable
 * against the RFC test vectors. Server-only (imports node:crypto).
 *
 * Defaults match what authenticator apps assume: HMAC-SHA1, 6 digits, 30s step.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // RFC 4648, no padding

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) continue; // skip stray separators
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A fresh base32 secret (default 20 bytes / 160 bits, per RFC 4226 §4). */
export function generateTotpSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

/** HOTP (RFC 4226): the counter-based primitive TOTP is built on. */
function hotp(secret: Buffer, counter: number, digits: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (bin % 10 ** digits).toString().padStart(digits, "0");
}

/** The TOTP value for a given instant (ms since epoch). */
export function totpAt(
  secretB32: string,
  time: number = Date.now(),
  step = 30,
  digits = 6,
): string {
  const counter = Math.floor(time / 1000 / step);
  return hotp(base32Decode(secretB32), counter, digits);
}

/**
 * Constant-time verify a submitted code, tolerating ±`window` steps of clock
 * drift (default ±1 → a 90s acceptance window). Rejects malformed input early.
 */
export function verifyTotp(
  secretB32: string,
  token: string,
  opts?: { time?: number; step?: number; digits?: number; window?: number },
): boolean {
  const time = opts?.time ?? Date.now();
  const step = opts?.step ?? 30;
  const digits = opts?.digits ?? 6;
  const window = opts?.window ?? 1;
  const clean = (token ?? "").replace(/\s+/g, "");
  if (!new RegExp(`^\\d{${digits}}$`).test(clean)) return false;
  const secret = base32Decode(secretB32);
  if (secret.length === 0) return false;
  const counter = Math.floor(time / 1000 / step);
  const submitted = Buffer.from(clean);
  for (let w = -window; w <= window; w++) {
    const expected = Buffer.from(hotp(secret, counter + w, digits));
    if (expected.length === submitted.length && timingSafeEqual(expected, submitted)) {
      return true;
    }
  }
  return false;
}

/** otpauth:// provisioning URI for QR codes / manual import into the app. */
export function otpauthUrl(opts: { secret: string; label: string; issuer: string }): string {
  const path = `${encodeURIComponent(opts.issuer)}:${encodeURIComponent(opts.label)}`;
  const params = new URLSearchParams({
    secret: opts.secret,
    issuer: opts.issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${path}?${params.toString()}`;
}

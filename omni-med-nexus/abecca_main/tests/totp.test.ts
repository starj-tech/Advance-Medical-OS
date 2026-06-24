import { describe, it, expect } from "vitest";
import {
  base32Encode, base32Decode, generateTotpSecret, totpAt, verifyTotp, otpauthUrl,
} from "@/lib/totp";

// RFC 6238 Appendix B reference secret (ASCII "12345678901234567890", SHA-1).
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890", "ascii"));

describe("totp: RFC 6238 test vectors (SHA-1, 8 digits)", () => {
  const vectors: [number, string][] = [
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
  ];
  for (const [t, expected] of vectors) {
    it(`T=${t} -> ${expected}`, () => {
      expect(totpAt(RFC_SECRET, t * 1000, 30, 8)).toBe(expected);
    });
  }
});

describe("totp: base32 round-trip", () => {
  it("decodes what it encodes", () => {
    const buf = Buffer.from([0, 1, 2, 3, 250, 255, 128, 64]);
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
  });
  it("ignores separators/case on decode", () => {
    const buf = Buffer.from("hello world");
    const enc = base32Encode(buf);
    expect(base32Decode(enc.toLowerCase().replace(/(.{4})/g, "$1 ")).equals(buf)).toBe(true);
  });
});

describe("totp: verifyTotp", () => {
  const secret = generateTotpSecret();
  const t = 1_700_000_000_000;

  it("accepts a freshly generated code", () => {
    expect(verifyTotp(secret, totpAt(secret, t), { time: t })).toBe(true);
  });
  it("tolerates one step of drift within the window", () => {
    const prev = totpAt(secret, t);
    expect(verifyTotp(secret, prev, { time: t + 30_000, window: 1 })).toBe(true);
    expect(verifyTotp(secret, prev, { time: t + 30_000, window: 0 })).toBe(false);
  });
  it("rejects malformed or wrong codes", () => {
    const code = totpAt(secret, t);
    const wrong = (code[0] === "0" ? "1" : "0") + code.slice(1);
    expect(verifyTotp(secret, wrong, { time: t, window: 0 })).toBe(false);
    expect(verifyTotp(secret, "12ab56", { time: t })).toBe(false);
    expect(verifyTotp(secret, "12345", { time: t })).toBe(false);
    expect(verifyTotp(secret, "", { time: t })).toBe(false);
  });
  it("rejects an empty secret", () => {
    expect(verifyTotp("", "123456", { time: t })).toBe(false);
  });
});

describe("totp: secret + provisioning URI", () => {
  it("default secret is 20 bytes (32 base32 chars)", () => {
    expect(generateTotpSecret()).toHaveLength(32);
    expect(generateTotpSecret(10)).toHaveLength(16);
  });
  it("otpauth URI carries the standard params", () => {
    const url = otpauthUrl({ secret: "ABC234", label: "user@rs.id", issuer: "Abecca" });
    expect(url.startsWith("otpauth://totp/")).toBe(true);
    expect(url).toContain("secret=ABC234");
    expect(url).toContain("issuer=Abecca");
    expect(url).toContain("algorithm=SHA1");
    expect(url).toContain("digits=6");
    expect(url).toContain("period=30");
  });
});

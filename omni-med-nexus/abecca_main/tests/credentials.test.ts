import { describe, it, expect } from "vitest";
import { daysUntil, credentialStatus, isCredentialType } from "@/lib/credentials";

const now = new Date("2026-06-18T00:00:00.000Z");
const plusDays = (n: number): string =>
  new Date(now.getTime() + n * 86_400_000).toISOString().slice(0, 10);

describe("credentials: daysUntil", () => {
  it("counts whole days to expiry", () => {
    expect(daysUntil(plusDays(10), now)).toBe(10);
    expect(daysUntil(plusDays(-3), now)).toBe(-3);
  });
});

describe("credentials: credentialStatus", () => {
  it("valid well before expiry", () => {
    expect(credentialStatus(plusDays(200), now)).toBe("valid");
  });
  it("expiring_soon at/under the 90-day window", () => {
    expect(credentialStatus(plusDays(90), now)).toBe("expiring_soon"); // boundary
    expect(credentialStatus(plusDays(45), now)).toBe("expiring_soon");
  });
  it("expired once the date has passed", () => {
    expect(credentialStatus(plusDays(-1), now)).toBe("expired");
  });
  it("honours a custom soon window", () => {
    expect(credentialStatus(plusDays(200), now, 365)).toBe("expiring_soon");
  });
});

describe("credentials: isCredentialType", () => {
  it("validates the licence types", () => {
    expect(isCredentialType("STR")).toBe(true);
    expect(isCredentialType("SIPA")).toBe(true);
    expect(isCredentialType("XYZ")).toBe(false);
    expect(isCredentialType(5)).toBe(false);
  });
});

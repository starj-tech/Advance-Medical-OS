import { describe, it, expect } from "vitest";
import { effectiveStatus, requiredConsentMet } from "@/lib/consent";
import {
  recordConsent, listConsents, withdrawConsent, consentSummary,
} from "@/server/clinical/consent";

const now = new Date("2026-06-18T00:00:00.000Z");
const FUTURE = "2027-01-01";
const PAST = "2026-01-01";

describe("consent: effectiveStatus (pure)", () => {
  it("granted with no expiry is active", () => {
    expect(effectiveStatus({ decision: "granted", validUntil: null }, now)).toBe("active");
  });
  it("granted within validity is active", () => {
    expect(effectiveStatus({ decision: "granted", validUntil: FUTURE }, now)).toBe("active");
  });
  it("granted past validity is expired", () => {
    expect(effectiveStatus({ decision: "granted", validUntil: PAST }, now)).toBe("expired");
  });
  it("withdrawn decision is withdrawn", () => {
    expect(effectiveStatus({ decision: "withdrawn", validUntil: FUTURE }, now)).toBe("withdrawn");
  });
  it("withdrawnAt wins over an otherwise-valid window", () => {
    expect(effectiveStatus({ decision: "granted", validUntil: FUTURE, withdrawnAt: "2026-05-01T00:00:00Z" }, now)).toBe("withdrawn");
  });
});

describe("consent: requiredConsentMet (pure)", () => {
  const surgeryActive = { consentType: "surgery" as const, decision: "granted" as const, validUntil: FUTURE };
  it("true when an active consent of the type exists", () => {
    expect(requiredConsentMet([surgeryActive], "surgery", now)).toBe(true);
  });
  it("false when only expired/withdrawn", () => {
    expect(requiredConsentMet([{ consentType: "surgery", decision: "granted", validUntil: PAST }], "surgery", now)).toBe(false);
    expect(requiredConsentMet([{ consentType: "surgery", decision: "withdrawn" }], "surgery", now)).toBe(false);
  });
  it("false for a different type or empty", () => {
    expect(requiredConsentMet([{ consentType: "general_treatment", decision: "granted", validUntil: null }], "surgery", now)).toBe(false);
    expect(requiredConsentMet([], "surgery", now)).toBe(false);
  });
});

describe("consent: register (in-memory)", () => {
  const A = "consent-test-A";
  const B = "consent-test-B";

  it("records, lists, and filters by patient", async () => {
    const c1 = await recordConsent(A, { patientId: "PAT-1", consentType: "general_treatment", grantor: "Pasien", validUntil: null });
    expect(c1.decision).toBe("granted");
    await recordConsent(A, { patientId: "PAT-2", consentType: "surgery", grantor: "Wali", relationship: "Ayah", validUntil: PAST });
    expect((await listConsents(A)).length).toBe(2);
    expect((await listConsents(A, { patientId: "PAT-1" })).length).toBe(1);
  });

  it("withdrawal is non-destructive and flips effective status", async () => {
    const c = await recordConsent(A, { patientId: "PAT-1", consentType: "data_sharing", grantor: "Pasien", validUntil: FUTURE });
    expect(effectiveStatus(c, now)).toBe("active");
    const w = await withdrawConsent(A, c.id);
    expect(w!.withdrawnAt).toBeTruthy();
    expect(effectiveStatus(w!, now)).toBe("withdrawn");
  });

  it("summarises by effective status", async () => {
    const sum = await consentSummary(A, now);
    expect(sum.total).toBe(3);
    expect(sum.byStatus.active).toBe(1);    // general_treatment PAT-1
    expect(sum.byStatus.expired).toBe(1);   // surgery PAT-2 (past)
    expect(sum.byStatus.withdrawn).toBe(1); // data_sharing withdrawn
  });

  it("is tenant-isolated", async () => {
    const a = (await listConsents(A))[0];
    expect((await listConsents(B)).length).toBe(0);
    expect(await withdrawConsent(B, a.id)).toBeUndefined();
    expect((await consentSummary(B, now)).total).toBe(0);
  });
});

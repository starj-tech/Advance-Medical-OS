import { describe, it, expect } from "vitest";
import {
  estimateCoverage, isPayerType, isClaimScheme, isEligibility,
} from "@/lib/payers";
import {
  createPayer, listPayers, updatePayer, estimateForPayer,
} from "@/server/billing/payers";

describe("payers: estimateCoverage (pure)", () => {
  const base = { coveragePercent: 100, deductible: 0, copay: 0, ceiling: null };
  it("self-pay covers nothing", () => {
    const e = estimateCoverage(1000, { ...base, coveragePercent: 0 });
    expect(e.covered).toBe(0);
    expect(e.patientResponsibility).toBe(1000);
  });
  it("full coverage", () => {
    const e = estimateCoverage(1000, base);
    expect(e.covered).toBe(1000);
    expect(e.patientResponsibility).toBe(0);
  });
  it("partial percent", () => {
    expect(estimateCoverage(1000, { ...base, coveragePercent: 80 }).covered).toBe(800);
  });
  it("deductible is paid by patient first", () => {
    const e = estimateCoverage(1000, { ...base, deductible: 200 });
    expect(e.covered).toBe(800);
    expect(e.patientResponsibility).toBe(200);
  });
  it("copay reduces the covered portion", () => {
    const e = estimateCoverage(1000, { ...base, copay: 50 });
    expect(e.covered).toBe(950);
    expect(e.patientResponsibility).toBe(50);
  });
  it("ceiling caps the payer's contribution", () => {
    const e = estimateCoverage(1000, { ...base, ceiling: 600 });
    expect(e.covered).toBe(600);
    expect(e.patientResponsibility).toBe(400);
  });
  it("deductible larger than gross clamps", () => {
    const e = estimateCoverage(100, { ...base, deductible: 500 });
    expect(e.deductible).toBe(100);
    expect(e.covered).toBe(0);
    expect(e.patientResponsibility).toBe(100);
  });
  it("negative gross clamps to zero", () => {
    const e = estimateCoverage(-50, base);
    expect(e.gross).toBe(0);
    expect(e.covered).toBe(0);
    expect(e.patientResponsibility).toBe(0);
  });
  it("applies deductible -> percent -> copay -> ceiling in order", () => {
    // gross 1000, ded 100 -> base 900, 80% -> 720, copay 50 -> 670, no ceiling
    const e = estimateCoverage(1000, { coveragePercent: 80, deductible: 100, copay: 50, ceiling: null });
    expect(e.covered).toBe(670);
    expect(e.patientResponsibility).toBe(330);
  });
});

describe("payers: guards", () => {
  it("validates enums", () => {
    expect(isPayerType("private_insurance")).toBe(true);
    expect(isPayerType("nope")).toBe(false);
    expect(isClaimScheme("casemix")).toBe(true);
    expect(isClaimScheme("nope")).toBe(false);
    expect(isEligibility("eligible")).toBe(true);
    expect(isEligibility("nope")).toBe(false);
  });
});

describe("payers: registry (in-memory)", () => {
  const A = "payer-test-A";
  const B = "payer-test-B";

  it("creates payers with sane defaults + clamping", async () => {
    const p = await createPayer(A, {
      name: "BPJS Kesehatan", payerType: "social_health_insurance", scheme: "casemix",
      currency: "IDR", coveragePercent: 150, deductible: -10, copay: 0, ceiling: null,
    });
    expect(p.active).toBe(true);
    expect(p.eligibilityStatus).toBe("unknown");
    expect(p.coveragePercent).toBe(100); // clamped from 150
    expect(p.deductible).toBe(0); // clamped from -10
  });

  it("lists, filters active, and updates", async () => {
    const priv = await createPayer(A, {
      name: "Global Health Insurer", payerType: "private_insurance", scheme: "fee_for_service",
      currency: "USD", coveragePercent: 80, deductible: 100, copay: 20, ceiling: 5000,
    });
    expect((await listPayers(A)).length).toBe(2);

    await updatePayer(A, priv.id, { eligibilityStatus: "eligible", active: false });
    const all = await listPayers(A);
    const updated = all.find((p) => p.id === priv.id)!;
    expect(updated.eligibilityStatus).toBe("eligible");
    expect(updated.active).toBe(false);
    expect((await listPayers(A, { activeOnly: true })).some((p) => p.id === priv.id)).toBe(false);
  });

  it("estimates against a payer's policy + currency", async () => {
    const p = await createPayer(A, {
      name: "Corp Plan", payerType: "corporate", scheme: "package",
      currency: "SGD", coveragePercent: 90, deductible: 0, copay: 0, ceiling: null,
    });
    const est = await estimateForPayer(A, p.id, 1000);
    expect(est).toBeDefined();
    expect(est!.currency).toBe("SGD");
    expect(est!.covered).toBe(900);
    expect(est!.patientResponsibility).toBe(100);
    expect(await estimateForPayer(A, "nope", 1000)).toBeUndefined();
  });

  it("is tenant-isolated", async () => {
    expect((await listPayers(B)).length).toBe(0);
    const a = (await listPayers(A))[0];
    expect(await updatePayer(B, a.id, { active: false })).toBeUndefined();
    expect(await estimateForPayer(B, a.id, 1000)).toBeUndefined();
  });
});

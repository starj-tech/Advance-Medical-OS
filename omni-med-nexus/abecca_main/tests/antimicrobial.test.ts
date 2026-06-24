import { describe, it, expect } from "vitest";
import { totalDdd, dddPer100PatientDays, antibioticByCode, isAntibioticCode } from "@/lib/antimicrobial";
import {
  recordConsumption, recordPatientDays, listConsumption, antimicrobialSummary,
} from "@/server/ppi/antimicrobial";

describe("antimicrobial: DDD math (pure)", () => {
  it("converts grams to DDDs against the WHO standard", () => {
    expect(totalDdd(6, 2)).toBe(3);      // 6 g of a 2 g/DDD drug = 3 DDD
    expect(totalDdd(1.5, 1.5)).toBe(1);
    expect(totalDdd(5, 0)).toBe(0);      // guard against zero standard
  });

  it("normalises DDD per 100 patient-days, null without a denominator", () => {
    expect(dddPer100PatientDays(50, 1000)).toBe(5);     // 50/1000*100
    expect(dddPer100PatientDays(3, 200)).toBe(1.5);
    expect(dddPer100PatientDays(10, 0)).toBeNull();
  });

  it("looks up the AWaRe catalog", () => {
    expect(antibioticByCode("J01DH02")?.aware).toBe("watch"); // Meropenem
    expect(antibioticByCode("J01CA04")?.aware).toBe("access"); // Amoksisilin
    expect(antibioticByCode("J01XX08")?.aware).toBe("reserve"); // Linezolid
    expect(isAntibioticCode("J01DH02")).toBe(true);
    expect(isAntibioticCode("ZZZ")).toBe(false);
  });
});

describe("antimicrobial: surveillance store + summary (in-memory)", () => {
  const A = "amr-test-A";
  const B = "amr-test-B";
  const P = "2026-06";

  it("records consumption and patient-days, aggregating grams per drug", async () => {
    await recordConsumption(A, { period: P, drugCode: "J01DH02", consumedGrams: 30 }); // Meropenem 3 g/DDD → 10 DDD
    await recordConsumption(A, { period: P, drugCode: "J01DH02", consumedGrams: 30 }); // another 10 DDD → 20 total
    await recordConsumption(A, { period: P, drugCode: "J01CA04", consumedGrams: 150 }); // Amoksisilin 1.5 g/DDD → 100 DDD
    await recordPatientDays(A, { period: P, patientDays: 2000 });
    expect((await listConsumption(A, P)).length).toBe(3);
  });

  it("summarises DDD/100 patient-days, per-drug usage, and AWaRe share", async () => {
    const sum = await antimicrobialSummary(A, P);
    expect(sum.patientDays).toBe(2000);
    expect(sum.totalDdd).toBeCloseTo(120, 5); // 20 (mero) + 100 (amox)
    expect(sum.totalDddPer100).toBe(6); // 120/2000*100
    // sorted by DDD desc → amoxicillin (100) first
    expect(sum.drugs[0].drugCode).toBe("J01CA04");
    expect(sum.drugs[0].ddd).toBeCloseTo(100, 5);
    expect(sum.drugs[1].ddd).toBeCloseTo(20, 5);
    // AWaRe split of total DDD: access 100/120 ≈ 83%, watch 20/120 ≈ 17%
    expect(sum.awareShare.access).toBe(83);
    expect(sum.awareShare.watch).toBe(17);
    expect(sum.awareShare.reserve).toBe(0);
  });

  it("upserts patient-days (one value per period)", async () => {
    await recordPatientDays(A, { period: P, patientDays: 1200 });
    const sum = await antimicrobialSummary(A, P);
    expect(sum.patientDays).toBe(1200);
    expect(sum.totalDddPer100).toBe(10); // 120/1200*100
  });

  it("is tenant-isolated", async () => {
    expect((await listConsumption(B, P)).length).toBe(0);
    const sumB = await antimicrobialSummary(B, P);
    expect(sumB.totalDdd).toBe(0);
    expect(sumB.totalDddPer100).toBeNull();
    expect(sumB.drugs.length).toBe(0);
  });
});

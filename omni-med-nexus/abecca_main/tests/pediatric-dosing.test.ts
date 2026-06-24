import { describe, it, expect } from "vitest";
import { drugByCode, isValidWeight, doseFor, PEDS_DRUGS } from "@/lib/pediatric-dosing";
import { recordDoseCalc, listDoseCalcs } from "@/server/clinical/pediatric-dosing";

const paracetamol = drugByCode("paracetamol")!;

describe("pediatric-dosing: helpers (pure)", () => {
  it("validates weight within a paediatric range", () => {
    expect(isValidWeight(12)).toBe(true);
    expect(isValidWeight(3.5)).toBe(true);
    expect(isValidWeight(0)).toBe(false);
    expect(isValidWeight(-1)).toBe(false);
    expect(isValidWeight(150)).toBe(false);
  });
  it("computes a normal weight-based dose", () => {
    // 10 kg × 15 mg/kg = 150 mg/dose; ×4 = 600 mg/day; under both ceilings.
    const d = doseFor(paracetamol, 10);
    expect(d.perDose).toBe(150);
    expect(d.perDoseCapped).toBe(false);
    expect(d.perDay).toBe(600);
    expect(d.perDayCapped).toBe(false);
    expect(d.frequencyPerDay).toBe(4);
  });
  it("caps the per-dose at the adult maximum", () => {
    // 80 kg × 15 = 1200 mg → capped to 1000 mg/dose; ×4 = 4000 (= max/day).
    const d = doseFor(paracetamol, 80);
    expect(d.perDose).toBe(1000);
    expect(d.perDoseCapped).toBe(true);
    expect(d.perDay).toBe(4000);
  });
  it("caps the per-day at the adult maximum", () => {
    const ibu = drugByCode("ibuprofen")!; // 10 mg/kg, max 400/dose, 3×, max 1200/day
    // 20 kg × 10 = 200/dose (uncapped); ×3 = 600/day (uncapped).
    expect(doseFor(ibu, 20)).toMatchObject({ perDose: 200, perDoseCapped: false, perDay: 600, perDayCapped: false });
    // 50 kg × 10 = 500 → capped 400/dose; ×3 = 1200 (= max/day).
    expect(doseFor(ibu, 50)).toMatchObject({ perDose: 400, perDoseCapped: true, perDay: 1200, perDayCapped: false });
  });
  it("rounds fractional doses to one decimal", () => {
    const dom = drugByCode("domperidone")!; // 0.25 mg/kg
    expect(doseFor(dom, 13).perDose).toBe(3.3); // 13 × 0.25 = 3.25 → 3.3
  });
  it("has a non-empty catalogue", () => {
    expect(PEDS_DRUGS.length).toBeGreaterThan(0);
  });
});

describe("pediatric-dosing: server (in-memory)", () => {
  const A = "dosing-test-A";
  const B = "dosing-test-B";

  it("records a computed dose and rejects unknown drug / bad weight", async () => {
    const r = await recordDoseCalc(A, { patientId: "PAT-D1", patientName: "An. D", drugCode: "paracetamol", weightKg: 80 });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.calculation.perDose).toBe(1000); expect(r.calculation.capped).toBe(true); expect(r.calculation.drugName).toBe("Parasetamol"); }
    const noDrug = await recordDoseCalc(A, { patientId: "PAT-D1", patientName: "An. D", drugCode: "nope", weightKg: 10 });
    expect(noDrug.ok).toBe(false);
    if (!noDrug.ok) expect(noDrug.reason).toBe("unknown_drug");
    const badWt = await recordDoseCalc(A, { patientId: "PAT-D1", patientName: "An. D", drugCode: "paracetamol", weightKg: 0 });
    expect(badWt.ok).toBe(false);
    if (!badWt.ok) expect(badWt.reason).toBe("invalid_weight");
  });

  it("lists per patient and stays tenant-isolated", async () => {
    await recordDoseCalc(A, { patientId: "PAT-D2", patientName: "An. E", drugCode: "ibuprofen", weightKg: 15 });
    expect((await listDoseCalcs(A, { patientId: "PAT-D1" })).length).toBe(1);
    expect((await listDoseCalcs(A)).length).toBe(2);
    expect((await listDoseCalcs(B)).length).toBe(0);
  });
});

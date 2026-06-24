import { describe, it, expect } from "vitest";
import { computeApache, apacheMortality, type ApacheInputs } from "@/lib/apache";

// A physiologically normal 30-year-old → every component scores 0.
const NORMAL: ApacheInputs = {
  temperatureC: 37, meanArterialPressure: 90, heartRate: 80, respiratoryRate: 16,
  pao2: 90, arterialPh: 7.4, sodium: 140, potassium: 4.0, creatinineMgDl: 1.0,
  hematocrit: 40, wbc: 8, gcs: 15, age: 30, chronicHealth: "none",
};

describe("apache: mortality bands (pure)", () => {
  it("maps score bands to approximate mortality", () => {
    expect(apacheMortality(0)).toBe(4);
    expect(apacheMortality(10)).toBe(15);
    expect(apacheMortality(20)).toBe(40);
    expect(apacheMortality(30)).toBe(73);
    expect(apacheMortality(40)).toBe(85);
  });
});

describe("apache: score computation (pure)", () => {
  it("scores a fully normal patient as 0 with low mortality", () => {
    const r = computeApache(NORMAL);
    expect(r.physiologicPoints).toBe(0);
    expect(r.agePoints).toBe(0);
    expect(r.chronicPoints).toBe(0);
    expect(r.score).toBe(0);
    expect(r.estimatedMortality).toBe(4);
  });

  it("adds age points by band", () => {
    expect(computeApache({ ...NORMAL, age: 70 }).agePoints).toBe(5);
    expect(computeApache({ ...NORMAL, age: 76 }).agePoints).toBe(6);
    expect(computeApache({ ...NORMAL, age: 50 }).agePoints).toBe(2);
  });

  it("doubles creatinine points in acute renal failure", () => {
    const base = computeApache({ ...NORMAL, creatinineMgDl: 4 }); // creat → 4 pts
    const arf = computeApache({ ...NORMAL, creatinineMgDl: 4, acuteRenalFailure: true });
    expect(base.physiologicPoints).toBe(4);
    expect(arf.physiologicPoints).toBe(8);
  });

  it("clamps GCS into 3–15 before scoring (15 − GCS)", () => {
    expect(computeApache({ ...NORMAL, gcs: 20 }).score).toBe(0);  // clamps to 15 → 0 pts
    expect(computeApache({ ...NORMAL, gcs: 1 }).score).toBe(12);  // clamps to 3 → 12 pts
  });

  it("sums physiologic + age + chronic for a critically-ill patient", () => {
    const r = computeApache({
      temperatureC: 41, meanArterialPressure: 40, heartRate: 190, respiratoryRate: 55,
      pao2: 50, arterialPh: 7.7, sodium: 185, potassium: 7.5, creatinineMgDl: 4,
      hematocrit: 65, wbc: 45, gcs: 3, age: 76, chronicHealth: "nonop_or_emergency_postop",
    });
    expect(r.physiologicPoints).toBe(56); // 11 components × 4 + (15 − 3)
    expect(r.agePoints).toBe(6);
    expect(r.chronicPoints).toBe(5);
    expect(r.score).toBe(67);
    expect(r.estimatedMortality).toBe(85);
  });
});

import { describe, it, expect } from "vitest";
import {
  morseScore, morseRisk, bradenScore, bradenRisk,
  coerceMorseInput, coerceBradenInput, scoreAssessment, isHighRisk,
  type MorseInput, type BradenInput,
} from "@/lib/nursing-scales";
import { recordAssessment, listAssessments, assessmentSummary } from "@/server/clinical/nursing-assessments";

const MORSE_WORST: MorseInput = {
  historyOfFalling: true, secondaryDiagnosis: true, ambulatoryAid: "furniture",
  ivTherapy: true, gait: "impaired", mentalStatus: "forgets",
};
const MORSE_NONE: MorseInput = {
  historyOfFalling: false, secondaryDiagnosis: false, ambulatoryAid: "none",
  ivTherapy: false, gait: "normal", mentalStatus: "oriented",
};
const BRADEN_BEST: BradenInput = { sensoryPerception: 4, moisture: 4, activity: 4, mobility: 4, nutrition: 4, frictionShear: 3 };
const BRADEN_WORST: BradenInput = { sensoryPerception: 1, moisture: 1, activity: 1, mobility: 1, nutrition: 1, frictionShear: 1 };

describe("nursing-scales: Morse (pure)", () => {
  it("scores and bands", () => {
    expect(morseScore(MORSE_WORST)).toBe(125);
    expect(morseScore(MORSE_NONE)).toBe(0);
    expect(morseScore({ ...MORSE_NONE, historyOfFalling: true })).toBe(25);
  });
  it("bands by threshold (higher = worse)", () => {
    expect(morseRisk(0)).toBe("low");
    expect(morseRisk(24)).toBe("low");
    expect(morseRisk(25)).toBe("medium");
    expect(morseRisk(44)).toBe("medium");
    expect(morseRisk(45)).toBe("high");
    expect(morseRisk(125)).toBe("high");
  });
});

describe("nursing-scales: Braden (pure)", () => {
  it("scores within 6–23", () => {
    expect(bradenScore(BRADEN_BEST)).toBe(23);
    expect(bradenScore(BRADEN_WORST)).toBe(6);
  });
  it("bands by threshold (lower = worse)", () => {
    expect(bradenRisk(23)).toBe("none");
    expect(bradenRisk(19)).toBe("none");
    expect(bradenRisk(18)).toBe("mild");
    expect(bradenRisk(15)).toBe("mild");
    expect(bradenRisk(14)).toBe("moderate");
    expect(bradenRisk(13)).toBe("moderate");
    expect(bradenRisk(12)).toBe("high");
    expect(bradenRisk(10)).toBe("high");
    expect(bradenRisk(9)).toBe("very_high");
    expect(bradenRisk(6)).toBe("very_high");
  });
});

describe("nursing-scales: coercion + helpers (pure)", () => {
  it("coerces valid Morse and rejects bad enums", () => {
    expect(coerceMorseInput(MORSE_WORST)).toEqual(MORSE_WORST);
    expect(coerceMorseInput({ ...MORSE_WORST, ambulatoryAid: "rocket" })).toBeNull();
    expect(coerceMorseInput(null)).toBeNull();
  });
  it("coerces valid Braden and rejects out-of-range subscales", () => {
    expect(coerceBradenInput(BRADEN_BEST)).toEqual(BRADEN_BEST);
    expect(coerceBradenInput({ ...BRADEN_BEST, frictionShear: 4 })).toBeNull(); // friction max 3
    expect(coerceBradenInput({ ...BRADEN_BEST, mobility: 0 })).toBeNull();
  });
  it("scoreAssessment unifies score+band; isHighRisk respects scale direction", () => {
    expect(scoreAssessment("morse", MORSE_WORST)).toMatchObject({ score: 125, band: "high" });
    expect(scoreAssessment("braden", BRADEN_WORST)).toMatchObject({ score: 6, band: "very_high" });
    expect(scoreAssessment("morse", { bad: true })).toBeNull();
    expect(isHighRisk("morse", "high")).toBe(true);
    expect(isHighRisk("morse", "medium")).toBe(false);
    expect(isHighRisk("braden", "very_high")).toBe(true);
    expect(isHighRisk("braden", "moderate")).toBe(false);
  });
});

describe("nursing-assessments: server (in-memory)", () => {
  const A = "nurse-test-A";
  const B = "nurse-test-B";
  const P1 = "PAT-N1";
  const P2 = "PAT-N2";

  it("records with server-computed score/band and rejects invalid items", async () => {
    const r = await recordAssessment(A, { patientId: P1, patientName: "Tn. A", scale: "morse", items: MORSE_WORST });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.assessment.score).toBe(125); expect(r.assessment.band).toBe("high"); }
    const bad = await recordAssessment(A, { patientId: P1, patientName: "Tn. A", scale: "morse", items: { ambulatoryAid: "nope" } });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toBe("invalid_items");
  });

  it("records more scales and filters by patient/scale", async () => {
    await recordAssessment(A, { patientId: P1, patientName: "Tn. A", scale: "braden", items: BRADEN_BEST });   // none
    await recordAssessment(A, { patientId: P2, patientName: "Ny. B", scale: "braden", items: BRADEN_WORST });  // very_high
    expect((await listAssessments(A, { patientId: P1 })).length).toBe(2);
    expect((await listAssessments(A, { scale: "morse" })).length).toBe(1);
  });

  it("summarises totals, per-scale and high-risk count", async () => {
    const s = await assessmentSummary(A);
    expect(s.total).toBe(3);
    expect(s.byScale).toEqual({ morse: 1, braden: 2 });
    expect(s.highRisk).toBe(2); // Morse 125 (high) + Braden 6 (very_high); Braden 23 (none) excluded
  });

  it("is tenant-isolated", async () => {
    expect((await listAssessments(B)).length).toBe(0);
    expect((await assessmentSummary(B)).total).toBe(0);
  });
});

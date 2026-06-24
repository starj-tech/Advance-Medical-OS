import { describe, it, expect } from "vitest";
import { screenPrescription, requiresOverride, type SafetyAlert } from "@/lib/drug-safety";

const kinds = (a: SafetyAlert[]) => a.map((x) => x.kind);

describe("drug-safety: allergy screening", () => {
  it("flags a direct allergen match as high severity", () => {
    const a = screenPrescription({ drugName: "Amoxicillin 500mg", patientAllergies: ["amoxicillin"], activeDrugNames: [] });
    expect(a).toHaveLength(1);
    expect(a[0].kind).toBe("allergy");
    expect(a[0].severity).toBe("high");
    expect(requiresOverride(a)).toBe(true);
  });

  it("catches cross-sensitivity via Indonesian allergen spelling (penisilin ⇒ amoxicillin)", () => {
    const a = screenPrescription({ drugName: "Amoxicillin", patientAllergies: ["penisilin"], activeDrugNames: [] });
    expect(kinds(a)).toContain("allergy");
  });

  it("does not flag an unrelated drug for a penicillin allergy", () => {
    const a = screenPrescription({ drugName: "Paracetamol", patientAllergies: ["penisilin"], activeDrugNames: [] });
    expect(a).toHaveLength(0);
  });
});

describe("drug-safety: interactions & duplicates", () => {
  it("flags anticoagulant + NSAID/antiplatelet bleeding risk as high", () => {
    const a = screenPrescription({ drugName: "Warfarin", patientAllergies: [], activeDrugNames: ["Aspirin"] });
    expect(kinds(a)).toContain("interaction");
    expect(a.some((x) => x.kind === "interaction" && x.severity === "high")).toBe(true);
    expect(requiresOverride(a)).toBe(true);
  });

  it("flags ACE inhibitor + potassium-sparing diuretic (hyperkalemia) as high", () => {
    const a = screenPrescription({ drugName: "Captopril", patientAllergies: [], activeDrugNames: ["Spironolactone"] });
    expect(a.some((x) => x.kind === "interaction" && x.severity === "high")).toBe(true);
  });

  it("flags NSAID duplication as a moderate interaction (no override needed)", () => {
    const a = screenPrescription({ drugName: "Ibuprofen", patientAllergies: [], activeDrugNames: ["Ketorolac"] });
    expect(a.some((x) => x.kind === "interaction" && x.severity === "moderate")).toBe(true);
    expect(requiresOverride(a)).toBe(false);
  });

  it("flags duplicate therapy when the same ingredient is already active", () => {
    const a = screenPrescription({ drugName: "Paracetamol", patientAllergies: [], activeDrugNames: ["Paracetamol Syrup"] });
    expect(kinds(a)).toContain("duplicate");
    expect(a.find((x) => x.kind === "duplicate")!.severity).toBe("moderate");
  });

  it("returns nothing for an unknown drug with no allergies", () => {
    expect(screenPrescription({ drugName: "Vitamin C", patientAllergies: [], activeDrugNames: ["Paracetamol"] })).toHaveLength(0);
  });

  it("orders alerts most-severe first and de-duplicates identical messages", () => {
    const a = screenPrescription({ drugName: "Warfarin", patientAllergies: ["warfarin"], activeDrugNames: ["Aspirin", "Aspirin"] });
    expect(a[0].severity).toBe("high"); // allergy/high sorts before any moderate
    const messages = a.map((x) => x.message);
    expect(new Set(messages).size).toBe(messages.length); // no duplicate messages
  });
});

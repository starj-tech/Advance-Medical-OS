/**
 * Predictive risk stratification — a transparent, deterministic scoring engine
 * that flags patients at elevated risk of readmission / deterioration from the
 * signals already captured (visit history, ED reliance, comorbidity burden,
 * presentation, age). Every point is attributable to a named factor so the
 * output is explainable at the bedside.
 *
 * This is an illustrative, rule-based stratifier — NOT a validated/trained
 * model (e.g. LACE, HOSPITAL). It is intended as a prioritisation aid and the
 * weights are tunable. Pure & client-safe (only a type import, erased at build).
 */
import type { EncounterType } from "@/server/clinical/encounters";

export type RiskBand = "low" | "medium" | "high";

export interface RiskFactor {
  label: string;
  points: number;
}

export interface RiskInput {
  /** Prior encounters for this patient (readmission signal). */
  priorEncounters: number;
  /** Prior ED encounters (acute-care reliance). */
  edVisits: number;
  /** Diagnoses recorded on the current encounter. */
  diagnosisCount: number;
  /** Chronic / high-readmission diagnoses on the current encounter. */
  chronicCount: number;
  /** How the current encounter presented. */
  currentType: EncounterType;
  /** Patient age in years, when known. */
  ageYears?: number | null;
}

export interface RiskResult {
  score: number;
  band: RiskBand;
  factors: RiskFactor[];
}

/**
 * ICD-10 prefixes treated as chronic / high-readmission conditions: diabetes
 * (E10–E14), hypertensive & ischaemic heart disease and heart failure (I10–I15,
 * I20–I25, I50), COPD/asthma (J44–J45), chronic kidney disease (N18) and
 * neoplasms (C). Matched by prefix like the INA-CBG illustration.
 */
const CHRONIC_PREFIXES = [
  "E10", "E11", "E12", "E13", "E14",
  "I10", "I11", "I12", "I13", "I15",
  "I20", "I21", "I22", "I25", "I50",
  "J44", "J45", "N18", "C",
];

export function isChronicCode(code: string): boolean {
  const c = code.toUpperCase().replace(/\./g, "");
  return CHRONIC_PREFIXES.some((p) => c.startsWith(p));
}

export function scoreEncounterRisk(input: RiskInput): RiskResult {
  const factors: RiskFactor[] = [];
  const add = (label: string, points: number) => {
    if (points > 0) factors.push({ label, points });
  };

  // Prior visits — the dominant readmission driver.
  if (input.priorEncounters >= 3) add("≥3 kunjungan sebelumnya", 25);
  else if (input.priorEncounters === 2) add("2 kunjungan sebelumnya", 15);
  else if (input.priorEncounters === 1) add("1 kunjungan sebelumnya", 8);

  // ED reliance.
  if (input.edVisits >= 2) add("≥2 kunjungan IGD sebelumnya", 15);
  else if (input.edVisits === 1) add("1 kunjungan IGD sebelumnya", 8);

  // Comorbidity burden.
  if (input.chronicCount >= 2) add("Multimorbiditas kronis (≥2)", 20);
  else if (input.chronicCount === 1) add("Kondisi kronis", 10);
  if (input.diagnosisCount >= 4) add("Beban diagnosis tinggi (≥4)", 8);

  // Current presentation.
  if (input.currentType === "ed") add("Masuk via IGD", 8);
  else if (input.currentType === "inpatient") add("Rawat inap", 5);

  // Age extremes.
  if (input.ageYears != null) {
    if (input.ageYears >= 75) add("Usia ≥75 tahun", 15);
    else if (input.ageYears >= 65) add("Usia ≥65 tahun", 10);
    else if (input.ageYears <= 1) add("Bayi (≤1 tahun)", 8);
  }

  const score = Math.min(100, factors.reduce((s, f) => s + f.points, 0));
  const band: RiskBand = score >= 45 ? "high" : score >= 20 ? "medium" : "low";
  return { score, band, factors };
}

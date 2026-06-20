/**
 * Antimicrobial stewardship model (PPRA — KARS) — client-safe & pure so the consumption
 * form, the dashboard, and the server agree. Antibiotic use is measured in DDDs (Defined
 * Daily Doses, WHO ATC/DDD) normalised per 100 patient-days, and each drug carries a WHO
 * AWaRe class (Access/Watch/Reserve) so over-reliance on Watch/Reserve agents is visible.
 * The DDD standards & AWaRe tags below are illustrative. No imports.
 */
export type AwareClass = "access" | "watch" | "reserve";
export const AWARE_CLASSES: AwareClass[] = ["access", "watch", "reserve"];
export const AWARE_LABEL: Record<AwareClass, string> = {
  access: "Access", watch: "Watch", reserve: "Reserve",
};
export const AWARE_VARIANT: Record<AwareClass, "success" | "warning" | "danger"> = {
  access: "success", watch: "warning", reserve: "danger",
};

export interface Antibiotic {
  code: string;        // WHO ATC code
  name: string;
  dddStandard: number; // WHO DDD standard in grams
  aware: AwareClass;
}
export const ANTIBIOTICS: Antibiotic[] = [
  { code: "J01CA04", name: "Amoksisilin", dddStandard: 1.5, aware: "access" },
  { code: "J01CR02", name: "Amoksisilin-Klavulanat", dddStandard: 1.5, aware: "access" },
  { code: "J01EE01", name: "Kotrimoksazol", dddStandard: 1.92, aware: "access" },
  { code: "J01FA10", name: "Azitromisin", dddStandard: 0.3, aware: "watch" },
  { code: "J01DD04", name: "Seftriakson", dddStandard: 2, aware: "watch" },
  { code: "J01MA02", name: "Siprofloksasin", dddStandard: 1, aware: "watch" },
  { code: "J01DH02", name: "Meropenem", dddStandard: 3, aware: "watch" },
  { code: "J01XA01", name: "Vankomisin", dddStandard: 2, aware: "watch" },
  { code: "J01XX08", name: "Linezolid", dddStandard: 1.2, aware: "reserve" },
  { code: "J01DI54", name: "Seftazidim-Avibaktam", dddStandard: 6, aware: "reserve" },
];
export const antibioticByCode = (code: string): Antibiotic | undefined =>
  ANTIBIOTICS.find((a) => a.code === code);
export const isAntibioticCode = (v: unknown): v is string =>
  typeof v === "string" && ANTIBIOTICS.some((a) => a.code === v);

/** Total DDDs consumed = grams consumed ÷ the WHO DDD standard (grams). */
export function totalDdd(consumedGrams: number, dddStandard: number): number {
  if (dddStandard <= 0) return 0;
  return consumedGrams / dddStandard;
}

/** DDD per 100 patient-days — the standard antimicrobial-consumption density; null if no patient-days. */
export function dddPer100PatientDays(ddd: number, patientDays: number): number | null {
  if (patientDays <= 0) return null;
  return Math.round((ddd / patientDays) * 100 * 100) / 100; // 2 decimals
}

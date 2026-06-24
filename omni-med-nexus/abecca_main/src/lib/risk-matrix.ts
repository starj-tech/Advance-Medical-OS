/**
 * Risk matrix (manajemen risiko / KARS-PMKP) — client-safe so the register form and
 * the server share the grading. A risk is scored on the standard 5×5 matrix:
 * likelihood (1–5) × consequence (1–5) = score (1–25), which maps to a band. Pure so
 * the heatmap, the list badges, and any reporting agree. No imports.
 */
export type Likelihood = 1 | 2 | 3 | 4 | 5;
export type Consequence = 1 | 2 | 3 | 4 | 5;

export const LIKELIHOOD_LABEL: Record<Likelihood, string> = {
  1: "Sangat jarang",
  2: "Jarang",
  3: "Mungkin",
  4: "Sering",
  5: "Hampir pasti",
};
export const CONSEQUENCE_LABEL: Record<Consequence, string> = {
  1: "Tidak signifikan",
  2: "Minor",
  3: "Moderat",
  4: "Mayor",
  5: "Katastropik",
};

export type RiskBand = "low" | "moderate" | "high" | "extreme";

export const RISK_BAND_LABEL: Record<RiskBand, string> = {
  low: "Rendah",
  moderate: "Moderat",
  high: "Tinggi",
  extreme: "Ekstrem",
};
export const RISK_BAND_VARIANT: Record<RiskBand, "success" | "info" | "warning" | "danger"> = {
  low: "success",
  moderate: "info",
  high: "warning",
  extreme: "danger",
};

/** Risk score on the 5×5 matrix: likelihood × consequence (1–25). */
export function riskScore(likelihood: number, consequence: number): number {
  const l = Math.min(5, Math.max(1, Math.round(likelihood)));
  const c = Math.min(5, Math.max(1, Math.round(consequence)));
  return l * c;
}

/**
 * Band from score, using the standard KARS grading ranges. Stated as ranges (not just
 * the products that 5×5 can produce) so any score in 1–25 grades sensibly:
 * low ≤3, moderate 4–6, high 7–12, extreme ≥13.
 */
export function riskBand(score: number): RiskBand {
  if (score <= 3) return "low";
  if (score <= 6) return "moderate";
  if (score <= 12) return "high";
  return "extreme";
}

/** Convenience: band straight from the two axes. */
export function bandFor(likelihood: number, consequence: number): RiskBand {
  return riskBand(riskScore(likelihood, consequence));
}

export type RiskStatus = "identified" | "mitigating" | "monitored" | "closed";
export const RISK_STATUSES: RiskStatus[] = ["identified", "mitigating", "monitored", "closed"];
export const RISK_STATUS_LABEL: Record<RiskStatus, string> = {
  identified: "Teridentifikasi",
  mitigating: "Mitigasi berjalan",
  monitored: "Dipantau",
  closed: "Ditutup",
};
export const RISK_STATUS_VARIANT: Record<RiskStatus, "warning" | "info" | "success" | "muted"> = {
  identified: "warning",
  mitigating: "info",
  monitored: "success",
  closed: "muted",
};

export type RiskCategory = "clinical" | "operational" | "financial" | "reputational" | "compliance" | "strategic";
export const RISK_CATEGORIES: RiskCategory[] = ["clinical", "operational", "financial", "reputational", "compliance", "strategic"];
export const RISK_CATEGORY_LABEL: Record<RiskCategory, string> = {
  clinical: "Klinis",
  operational: "Operasional",
  financial: "Keuangan",
  reputational: "Reputasi",
  compliance: "Kepatuhan",
  strategic: "Strategis",
};

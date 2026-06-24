/**
 * Multi-payer coverage model (global revenue cycle) — client-safe & pure so the payer
 * form, the live estimator, and the server share one coverage math. Complements the
 * Indonesia-only INA-CBG grouper (lib/inacbg) with a generic, country-agnostic
 * "what does the payer cover vs the patient" calculation in any currency. No node imports.
 */
import type { Currency } from "./i18n";

export type PayerType =
  | "self_pay"
  | "social_health_insurance"
  | "private_insurance"
  | "corporate"
  | "government_scheme";

export const PAYER_TYPES: PayerType[] = [
  "self_pay", "social_health_insurance", "private_insurance", "corporate", "government_scheme",
];
export const PAYER_TYPE_LABEL: Record<PayerType, string> = {
  self_pay: "Bayar sendiri",
  social_health_insurance: "Jaminan sosial (mis. BPJS)",
  private_insurance: "Asuransi swasta",
  corporate: "Perusahaan / korporat",
  government_scheme: "Skema pemerintah",
};

export type ClaimScheme = "fee_for_service" | "casemix" | "capitation" | "package";
export const CLAIM_SCHEMES: ClaimScheme[] = ["fee_for_service", "casemix", "capitation", "package"];
export const CLAIM_SCHEME_LABEL: Record<ClaimScheme, string> = {
  fee_for_service: "Fee-for-service",
  casemix: "Case-mix (DRG/INA-CBG)",
  capitation: "Kapitasi",
  package: "Paket",
};

export type EligibilityStatus = "eligible" | "ineligible" | "pending" | "unknown";
export const ELIGIBILITY_LABEL: Record<EligibilityStatus, string> = {
  eligible: "Berlaku", ineligible: "Tidak berlaku", pending: "Menunggu", unknown: "Belum dicek",
};
export const ELIGIBILITY_VARIANT: Record<EligibilityStatus, "success" | "danger" | "warning" | "muted"> = {
  eligible: "success", ineligible: "danger", pending: "warning", unknown: "muted",
};

export interface CoveragePolicy {
  /** Share of the eligible amount the payer covers (0–100). */
  coveragePercent: number;
  /** Amount the patient pays first, before coverage applies. */
  deductible: number;
  /** Flat amount the patient contributes from the covered portion. */
  copay: number;
  /** Maximum the payer will pay (benefit ceiling); null = uncapped. */
  ceiling: number | null;
}

export interface CoverageEstimate {
  gross: number;
  deductible: number;
  copay: number;
  covered: number;
  patientResponsibility: number;
}

const clampInt = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : 0)));

/**
 * Split a gross charge into payer-covered vs patient-responsibility. Order:
 * deductible (patient first) → percent of the remainder → minus copay → capped at the
 * ceiling. Amounts are in the payer's currency; the patient always covers the balance.
 */
export function estimateCoverage(gross: number, policy: CoveragePolicy): CoverageEstimate {
  const g = Math.max(0, Math.round(Number.isFinite(gross) ? gross : 0));
  const deductible = Math.min(Math.max(0, Math.round(policy.deductible)), g);
  const base = g - deductible;
  const pct = clampInt(policy.coveragePercent, 0, 100);
  const rawCovered = Math.round((base * pct) / 100);
  const copay = Math.min(Math.max(0, Math.round(policy.copay)), rawCovered);
  let covered = rawCovered - copay;
  if (policy.ceiling != null) covered = Math.min(covered, Math.max(0, Math.round(policy.ceiling)));
  covered = Math.max(0, covered);
  return { gross: g, deductible, copay, covered, patientResponsibility: g - covered };
}

export const isPayerType = (v: unknown): v is PayerType =>
  typeof v === "string" && (PAYER_TYPES as string[]).includes(v);
export const isClaimScheme = (v: unknown): v is ClaimScheme =>
  typeof v === "string" && (CLAIM_SCHEMES as string[]).includes(v);
export const isEligibility = (v: unknown): v is EligibilityStatus =>
  typeof v === "string" && v in ELIGIBILITY_LABEL;

export type { Currency };

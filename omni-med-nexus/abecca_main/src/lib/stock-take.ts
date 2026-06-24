/**
 * Stock-take (opname) model — client-safe & pure so the count form, the register
 * badges, and the server agree on the variance. A stock-take compares a batch's system
 * on-hand quantity against the physically counted quantity; the signed variance and its
 * status (match / surplus / shortage) drive reconciliation and audit. No imports.
 */
export type VarianceStatus = "match" | "surplus" | "shortage";

export const VARIANCE_STATUS_LABEL: Record<VarianceStatus, string> = {
  match: "Sesuai",
  surplus: "Lebih",
  shortage: "Kurang",
};
export const VARIANCE_STATUS_VARIANT: Record<VarianceStatus, "success" | "warning" | "danger"> = {
  match: "success",
  surplus: "warning",
  shortage: "danger",
};

/** Signed variance = counted − system (counted clamped ≥ 0). */
export function variance(systemQty: number, countedQty: number): number {
  return Math.max(0, Math.round(countedQty)) - Math.max(0, Math.round(systemQty));
}

/** Zero is a match; positive is surplus; negative is shortage. */
export function varianceStatus(v: number): VarianceStatus {
  if (v === 0) return "match";
  return v > 0 ? "surplus" : "shortage";
}

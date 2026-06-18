/**
 * Pharmacy inventory model — client-safe so the stock forms and the server share
 * the status logic. Stock is tracked per item as the sum of its batches; each
 * batch has an expiry date. The two derived signals — reorder status (vs the
 * reorder point) and expiry bucket (vs the soon window) — are pure so the
 * dashboard alerts and any reporting agree. No imports.
 */
export type StockStatus = "ok" | "low" | "out";

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  ok: "Cukup",
  low: "Stok rendah",
  out: "Habis",
};
export const STOCK_STATUS_VARIANT: Record<StockStatus, "success" | "warning" | "danger"> = {
  ok: "success",
  low: "warning",
  out: "danger",
};

/** Reorder status: out at zero, low at/under the reorder point, else ok. */
export function stockStatus(totalStock: number, reorderPoint: number): StockStatus {
  if (totalStock <= 0) return "out";
  if (totalStock <= reorderPoint) return "low";
  return "ok";
}

export type ExpiryBucket = "ok" | "expiring_soon" | "expired";

export const EXPIRY_LABEL: Record<ExpiryBucket, string> = {
  ok: "Aman",
  expiring_soon: "Segera kedaluwarsa",
  expired: "Kedaluwarsa",
};
export const EXPIRY_VARIANT: Record<ExpiryBucket, "success" | "warning" | "danger"> = {
  ok: "success",
  expiring_soon: "warning",
  expired: "danger",
};

/** Whole days from `now` until the expiry date (negative once expired). */
export function daysToExpiry(expiryDate: string, now: Date): number {
  return Math.ceil((new Date(expiryDate).getTime() - now.getTime()) / 86_400_000);
}

/** Expired once the date passes; "expiring_soon" within `soonDays` (default 90). */
export function expiryBucket(expiryDate: string, now: Date, soonDays = 90): ExpiryBucket {
  const days = daysToExpiry(expiryDate, now);
  if (days < 0) return "expired";
  if (days <= soonDays) return "expiring_soon";
  return "ok";
}

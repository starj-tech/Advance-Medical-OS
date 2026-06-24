/**
 * Biomedical asset & calibration model (IPSRS — KARS/MFK). Client-safe & pure so the
 * asset form, the register, and the server agree. Each asset has an operational status
 * and an optional next calibration/maintenance due date; the calibration state is always
 * derived from that date (overdue/due_soon/ok) so the board never shows a stale "ok".
 * Mirrors the credential-expiry pattern. No imports.
 */
export type AssetStatus = "operational" | "maintenance" | "broken" | "retired";
export const ASSET_STATUSES: AssetStatus[] = ["operational", "maintenance", "broken", "retired"];
export const ASSET_STATUS_LABEL: Record<AssetStatus, string> = {
  operational: "Operasional", maintenance: "Pemeliharaan", broken: "Rusak", retired: "Dipensiunkan",
};
export const ASSET_STATUS_VARIANT: Record<AssetStatus, "success" | "warning" | "danger" | "muted"> = {
  operational: "success", maintenance: "warning", broken: "danger", retired: "muted",
};

export type AssetCategory =
  | "life_support" | "diagnostic" | "imaging" | "laboratory"
  | "surgical" | "monitoring" | "sterilization" | "other";
export const ASSET_CATEGORIES: AssetCategory[] = [
  "life_support", "diagnostic", "imaging", "laboratory", "surgical", "monitoring", "sterilization", "other",
];
export const ASSET_CATEGORY_LABEL: Record<AssetCategory, string> = {
  life_support: "Penunjang Hidup", diagnostic: "Diagnostik", imaging: "Radiologi/Imaging",
  laboratory: "Laboratorium", surgical: "Bedah", monitoring: "Monitoring",
  sterilization: "Sterilisasi (CSSD)", other: "Lainnya",
};

export type CalibrationState = "ok" | "due_soon" | "overdue";
export const CALIBRATION_LABEL: Record<CalibrationState, string> = {
  ok: "Terkalibrasi", due_soon: "Segera jatuh tempo", overdue: "Lewat jatuh tempo",
};
export const CALIBRATION_VARIANT: Record<CalibrationState, "success" | "warning" | "danger"> = {
  ok: "success", due_soon: "warning", overdue: "danger",
};

/** Whole days until the next calibration/maintenance date (negative once overdue); null if unscheduled. */
export function daysUntilDue(nextDue: string | null, now: Date): number | null {
  if (!nextDue) return null;
  return Math.ceil((new Date(nextDue).getTime() - now.getTime()) / 86_400_000);
}

/** Calibration state from the next-due date: overdue past it, due_soon within `soonDays`, else ok; null if unscheduled. */
export function calibrationState(nextDue: string | null, now: Date, soonDays = 30): CalibrationState | null {
  const days = daysUntilDue(nextDue, now);
  if (days === null) return null;
  if (days < 0) return "overdue";
  if (days <= soonDays) return "due_soon";
  return "ok";
}

export const isAssetStatus = (v: unknown): v is AssetStatus =>
  typeof v === "string" && (ASSET_STATUSES as string[]).includes(v);
export const isAssetCategory = (v: unknown): v is AssetCategory =>
  typeof v === "string" && (ASSET_CATEGORIES as string[]).includes(v);

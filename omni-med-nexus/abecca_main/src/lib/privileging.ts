/**
 * Clinical privileging model (Rincian Kewenangan Klinis — KARS/KPS). Distinct from the
 * credential registry: a credential proves a licence (STR/SIP), a privilege is the
 * hospital's internal authorisation for a clinician to perform a specific procedure.
 * Client-safe & pure so the request form, the board, and the server agree. A granted
 * privilege lapses once its review date passes (derived, never a stale "granted"). No imports.
 */
export type PrivilegeStatus = "requested" | "granted" | "suspended" | "expired";
export const PRIVILEGE_STATUSES: PrivilegeStatus[] = ["requested", "granted", "suspended", "expired"];
export const PRIVILEGE_STATUS_LABEL: Record<PrivilegeStatus, string> = {
  requested: "Diajukan", granted: "Disetujui", suspended: "Ditangguhkan", expired: "Kedaluwarsa",
};
export const PRIVILEGE_STATUS_VARIANT: Record<PrivilegeStatus, "info" | "success" | "warning" | "danger"> = {
  requested: "info", granted: "success", suspended: "warning", expired: "danger",
};

export type PrivilegeCategory = "medical" | "surgical" | "anesthesia" | "obstetric" | "diagnostic" | "nursing" | "other";
export const PRIVILEGE_CATEGORIES: PrivilegeCategory[] = [
  "medical", "surgical", "anesthesia", "obstetric", "diagnostic", "nursing", "other",
];
export const PRIVILEGE_CATEGORY_LABEL: Record<PrivilegeCategory, string> = {
  medical: "Medis", surgical: "Bedah", anesthesia: "Anestesi", obstetric: "Obstetri-Ginekologi",
  diagnostic: "Diagnostik", nursing: "Keperawatan", other: "Lainnya",
};

/**
 * Effective status: only a *granted* privilege lapses to "expired" once its review date
 * passes; requested/suspended are explicit states that stand regardless of the date.
 */
export function effectivePrivilegeStatus(
  status: PrivilegeStatus,
  reviewBy: string | null,
  now: Date,
): PrivilegeStatus {
  if (status === "granted" && reviewBy && new Date(reviewBy).getTime() < now.getTime()) {
    return "expired";
  }
  return status;
}

/** Whole days until the review date (negative once past); null when no date is set. */
export function daysUntilReview(reviewBy: string | null, now: Date): number | null {
  if (!reviewBy) return null;
  return Math.ceil((new Date(reviewBy).getTime() - now.getTime()) / 86_400_000);
}

export const isPrivilegeStatus = (v: unknown): v is PrivilegeStatus =>
  typeof v === "string" && (PRIVILEGE_STATUSES as string[]).includes(v);
export const isPrivilegeCategory = (v: unknown): v is PrivilegeCategory =>
  typeof v === "string" && (PRIVILEGE_CATEGORIES as string[]).includes(v);

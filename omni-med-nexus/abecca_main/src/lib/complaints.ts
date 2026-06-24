/**
 * Patient complaint / grievance model (KARS-PMKP) — client-safe & pure so the intake
 * form, the register badges, and the server agree on the SLA state. Each complaint has a
 * category + severity (which sets the resolution-time target) and a status lifecycle; the
 * SLA state is derived (met/breached once resolved, on_track/overdue while open). No imports.
 */
export type ComplaintCategory = "service" | "clinical" | "facility" | "billing" | "communication" | "other";
export const COMPLAINT_CATEGORIES: ComplaintCategory[] = ["service", "clinical", "facility", "billing", "communication", "other"];
export const COMPLAINT_CATEGORY_LABEL: Record<ComplaintCategory, string> = {
  service: "Pelayanan", clinical: "Klinis", facility: "Fasilitas",
  billing: "Tagihan/biaya", communication: "Komunikasi", other: "Lainnya",
};

export type ComplaintSeverity = "low" | "medium" | "high";
export const COMPLAINT_SEVERITIES: ComplaintSeverity[] = ["low", "medium", "high"];
export const COMPLAINT_SEVERITY_LABEL: Record<ComplaintSeverity, string> = {
  low: "Rendah", medium: "Sedang", high: "Tinggi",
};
export const COMPLAINT_SEVERITY_VARIANT: Record<ComplaintSeverity, "muted" | "warning" | "danger"> = {
  low: "muted", medium: "warning", high: "danger",
};
/** Resolution-time target (days) per severity — drives the SLA state. */
export const SLA_TARGET_DAYS: Record<ComplaintSeverity, number> = { low: 7, medium: 3, high: 1 };

export type ComplaintStatus = "open" | "in_progress" | "resolved" | "closed";
export const COMPLAINT_STATUSES: ComplaintStatus[] = ["open", "in_progress", "resolved", "closed"];
export const COMPLAINT_STATUS_LABEL: Record<ComplaintStatus, string> = {
  open: "Terbuka", in_progress: "Ditangani", resolved: "Selesai", closed: "Ditutup",
};
export const COMPLAINT_STATUS_VARIANT: Record<ComplaintStatus, "warning" | "info" | "success" | "muted"> = {
  open: "warning", in_progress: "info", resolved: "success", closed: "muted",
};

export type SlaState = "on_track" | "overdue" | "met" | "breached";
export const SLA_STATE_LABEL: Record<SlaState, string> = {
  on_track: "Sesuai target", overdue: "Lewat target", met: "Tepat waktu", breached: "Terlambat",
};
export const SLA_STATE_VARIANT: Record<SlaState, "info" | "danger" | "success" | "warning"> = {
  on_track: "info", overdue: "danger", met: "success", breached: "warning",
};

/** Whole days between two instants (floored, never negative). */
export function daysBetween(from: string, to: number): number {
  return Math.max(0, Math.floor((to - new Date(from).getTime()) / 86_400_000));
}

/**
 * SLA state: once resolved, met/breached vs the target; while open, on_track/overdue.
 * `resolvedAt` distinguishes a closed complaint from an open one.
 */
export function slaState(
  severity: ComplaintSeverity,
  createdAt: string,
  resolvedAt: string | null,
  now: Date,
): SlaState {
  const target = SLA_TARGET_DAYS[severity];
  if (resolvedAt) {
    return daysBetween(createdAt, new Date(resolvedAt).getTime()) <= target ? "met" : "breached";
  }
  return daysBetween(createdAt, now.getTime()) <= target ? "on_track" : "overdue";
}

export const isComplaintCategory = (v: unknown): v is ComplaintCategory =>
  typeof v === "string" && (COMPLAINT_CATEGORIES as string[]).includes(v);
export const isComplaintSeverity = (v: unknown): v is ComplaintSeverity =>
  typeof v === "string" && (COMPLAINT_SEVERITIES as string[]).includes(v);
export const isComplaintStatus = (v: unknown): v is ComplaintStatus =>
  typeof v === "string" && (COMPLAINT_STATUSES as string[]).includes(v);

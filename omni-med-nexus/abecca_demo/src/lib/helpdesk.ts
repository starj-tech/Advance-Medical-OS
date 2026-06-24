/**
 * IT helpdesk / service-desk model (Domain K). Client-safe & pure so the ticket form, the
 * board, and the server agree. Each ticket has a priority that sets a FIRST-RESPONSE SLA
 * target in HOURS (distinct from the complaint module's resolution SLA in days) and a status
 * lifecycle; the SLA state is derived (met/breached once a first response is logged,
 * on_track/overdue while still awaiting one). No imports.
 */
export type TicketPriority = "low" | "medium" | "high" | "critical";
export const TICKET_PRIORITIES: TicketPriority[] = ["low", "medium", "high", "critical"];
export const TICKET_PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: "Rendah", medium: "Sedang", high: "Tinggi", critical: "Kritis",
};
export const TICKET_PRIORITY_VARIANT: Record<TicketPriority, "muted" | "info" | "warning" | "danger"> = {
  low: "muted", medium: "info", high: "warning", critical: "danger",
};
/** First-response SLA target (hours) per priority — drives the SLA state. */
export const RESPONSE_SLA_HOURS: Record<TicketPriority, number> = { low: 24, medium: 8, high: 4, critical: 1 };

export type TicketCategory = "hardware" | "software" | "network" | "account" | "medical_device" | "other";
export const TICKET_CATEGORIES: TicketCategory[] = ["hardware", "software", "network", "account", "medical_device", "other"];
export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  hardware: "Perangkat keras", software: "Perangkat lunak", network: "Jaringan",
  account: "Akun/akses", medical_device: "Alat medis", other: "Lainnya",
};

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export const TICKET_STATUSES: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];
export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Baru", in_progress: "Dikerjakan", resolved: "Selesai", closed: "Ditutup",
};
export const TICKET_STATUS_VARIANT: Record<TicketStatus, "warning" | "info" | "success" | "muted"> = {
  open: "warning", in_progress: "info", resolved: "success", closed: "muted",
};

export type ResponseSla = "on_track" | "overdue" | "met" | "breached";
export const RESPONSE_SLA_LABEL: Record<ResponseSla, string> = {
  on_track: "Sesuai target", overdue: "Lewat target", met: "Respon tepat waktu", breached: "Respon terlambat",
};
export const RESPONSE_SLA_VARIANT: Record<ResponseSla, "info" | "danger" | "success" | "warning"> = {
  on_track: "info", overdue: "danger", met: "success", breached: "warning",
};

/** Hours between two instants (never negative). */
export function hoursBetween(from: string, to: number): number {
  return Math.max(0, (to - new Date(from).getTime()) / 3_600_000);
}

/**
 * First-response SLA: once a first response is logged, met/breached vs the target;
 * while still awaiting one, on_track/overdue.
 */
export function responseSla(
  priority: TicketPriority,
  createdAt: string,
  firstResponseAt: string | null,
  now: Date,
): ResponseSla {
  const target = RESPONSE_SLA_HOURS[priority];
  if (firstResponseAt) {
    return hoursBetween(createdAt, new Date(firstResponseAt).getTime()) <= target ? "met" : "breached";
  }
  return hoursBetween(createdAt, now.getTime()) <= target ? "on_track" : "overdue";
}

export const isTicketPriority = (v: unknown): v is TicketPriority =>
  typeof v === "string" && (TICKET_PRIORITIES as string[]).includes(v);
export const isTicketCategory = (v: unknown): v is TicketCategory =>
  typeof v === "string" && (TICKET_CATEGORIES as string[]).includes(v);
export const isTicketStatus = (v: unknown): v is TicketStatus =>
  typeof v === "string" && (TICKET_STATUSES as string[]).includes(v);

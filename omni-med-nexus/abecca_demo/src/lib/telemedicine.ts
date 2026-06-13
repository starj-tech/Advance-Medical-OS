/**
 * Telemedicine (video visit) — shared status model for the session lifecycle.
 * Client-safe so the schedule board and the server agree on which transitions
 * are legal. The actual video room is provided by an external service (the
 * server builds the join URL); this file is pure state logic.
 */
export type TeleStatus = "scheduled" | "waiting" | "in_progress" | "completed" | "cancelled";

export const TELE_STATUSES: TeleStatus[] = [
  "scheduled",
  "waiting",
  "in_progress",
  "completed",
  "cancelled",
];

export const TELE_STATUS_LABEL: Record<TeleStatus, string> = {
  scheduled: "Terjadwal",
  waiting: "Ruang tunggu",
  in_progress: "Berlangsung",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const isTeleStatus = (s: unknown): s is TeleStatus =>
  typeof s === "string" && (TELE_STATUSES as string[]).includes(s);

/** Allowed forward transitions; cancel is permitted from any non-terminal state. */
const NEXT: Record<TeleStatus, TeleStatus[]> = {
  scheduled: ["waiting", "in_progress", "cancelled"],
  waiting: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: TeleStatus, to: TeleStatus): boolean {
  return NEXT[from]?.includes(to) ?? false;
}

/** A session is "live" (join button active) while waiting or in progress. */
export const isJoinable = (s: TeleStatus): boolean => s === "waiting" || s === "in_progress";

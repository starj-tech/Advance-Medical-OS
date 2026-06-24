/**
 * Observability primitives — shared, client-safe so the dashboard and the server
 * agree on the event-level vocabulary, and so field redaction is defined once.
 * Structured events (server/observability/log.ts) carry an arbitrary `fields`
 * bag; anything that looks like a secret/PII key is masked before it is ever
 * persisted or shown, so logging can never leak a password, token or card number.
 */
export type EventLevel = "debug" | "info" | "warn" | "error";

export const EVENT_LEVELS: EventLevel[] = ["debug", "info", "warn", "error"];

export const EVENT_LEVEL_LABEL: Record<EventLevel, string> = {
  debug: "Debug",
  info: "Info",
  warn: "Peringatan",
  error: "Error",
};

export const isEventLevel = (v: unknown): v is EventLevel =>
  typeof v === "string" && (EVENT_LEVELS as string[]).includes(v);

/** Keys whose values must never be logged in clear text. */
const SENSITIVE = /pass(word)?|token|secret|authorization|api[-_]?key|code[-_]?hash|ssn|nik|no[-_]?kartu|kartu/i;

/** Mask sensitive values in a flat field bag (by key name). Non-mutating. */
export function redactFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = SENSITIVE.test(k) ? "***" : v;
  return out;
}

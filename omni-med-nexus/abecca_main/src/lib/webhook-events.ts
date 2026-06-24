/**
 * Webhook event catalogue — client-safe so the integrations UI and the server
 * agree on the subscribable events. Each event is delivered as a signed POST to
 * the registered endpoints subscribed to it (see server/integrations/webhooks).
 */
export type WebhookEvent =
  | "appointment.created"
  | "appointment.checked_in"
  | "diagnostic.critical";

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  "appointment.created",
  "appointment.checked_in",
  "diagnostic.critical",
];

export const WEBHOOK_EVENT_LABEL: Record<WebhookEvent, string> = {
  "appointment.created": "Janji temu dibuat",
  "appointment.checked_in": "Pasien check-in",
  "diagnostic.critical": "Nilai kritis lab/radiologi",
};

export const isWebhookEvent = (v: unknown): v is WebhookEvent =>
  typeof v === "string" && (WEBHOOK_EVENTS as string[]).includes(v);

/** Keep only the valid, de-duplicated events from arbitrary input. */
export function normalizeEvents(input: unknown): WebhookEvent[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.filter(isWebhookEvent))];
}

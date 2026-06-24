/**
 * Webhook payload signing — pure HMAC-SHA256 over `${timestamp}.${body}`, the same
 * scheme the Stripe webhook verifier uses (server/billing/stripe.ts), so receivers
 * can authenticate deliveries with a shared secret. Server-only (node:crypto).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** Produce the `X-Abecca-Signature` value: `sha256=<hex>` over `${timestamp}.${body}`. */
export function signWebhook(secret: string, timestamp: string, body: string): string {
  const mac = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `sha256=${mac}`;
}

/** Constant-time verification of a received signature header. */
export function verifyWebhookSignature(
  secret: string,
  timestamp: string,
  body: string,
  header: string,
): boolean {
  const expected = signWebhook(secret, timestamp, body);
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Stripe integration via the REST API (no SDK dependency → Vercel-safe).
 *
 * Env-gated: when STRIPE_SECRET_KEY is set we talk to Stripe; otherwise the
 * caller falls back to "mock mode" (immediate provisioning). Webhook signatures
 * are verified with node:crypto, matching Stripe's t=…,v1=… scheme.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Plan } from "./plans";

const API = "https://api.stripe.com/v1";

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

function secretKey(): string {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new Error("STRIPE_SECRET_KEY is not set");
  return k;
}

/** Resolve a plan's Stripe Price ID from its configured env var, if any. */
export function priceIdFor(plan: Plan): string | undefined {
  return plan.priceEnv ? process.env[plan.priceEnv] || undefined : undefined;
}

function encodeForm(obj: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) p.set(k, String(v));
  }
  return p.toString();
}

export async function createCheckoutSession(args: {
  plan: Plan;
  priceId: string;
  quantity: number;
  token: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  const res = await fetch(`${API}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodeForm({
      mode: "subscription",
      "line_items[0][price]": args.priceId,
      "line_items[0][quantity]": args.quantity,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      customer_email: args.customerEmail,
      "metadata[token]": args.token,
      "metadata[plan]": args.plan.id,
      "subscription_data[metadata][token]": args.token,
    }),
  });
  if (!res.ok) {
    throw new Error(`Stripe checkout failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { url?: string };
  if (!json.url) throw new Error("Stripe did not return a checkout URL");
  return { url: json.url };
}

/**
 * Verify a Stripe webhook signature header ("t=…,v1=…") against the raw body,
 * with a replay-tolerance window. Constant-time compare; no SDK needed.
 */
export function verifyWebhookSignature(
  payload: string,
  header: string | null,
  webhookSecret: string,
  toleranceSec = 300,
): boolean {
  if (!header) return false;
  const fields = new Map<string, string>();
  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx > 0) fields.set(part.slice(0, idx), part.slice(idx + 1));
  }
  const t = fields.get("t");
  const v1 = fields.get("v1");
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) return false;

  const expected = createHmac("sha256", webhookSecret)
    .update(`${t}.${payload}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

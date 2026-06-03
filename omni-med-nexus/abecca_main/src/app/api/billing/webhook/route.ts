import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/server/billing/stripe";
import { takePending } from "@/server/billing/pending";
import { provisionAndNotify } from "@/server/billing/provision";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook. On `checkout.session.completed` we read the token from the
 * session metadata, load the parked registration, and provision the tenant.
 * The raw body is required for signature verification, so we read text().
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const payload = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!secret || !verifyWebhookSignature(payload, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    type?: string;
    data?: {
      object?: { metadata?: { token?: string }; customer?: string; subscription?: string };
    };
  };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const obj = event.data?.object;
    const token = obj?.metadata?.token;
    if (token) {
      const pending = await takePending(token);
      if (pending) {
        if (typeof obj?.customer === "string") pending.registration.stripeCustomerId = obj.customer;
        if (typeof obj?.subscription === "string") {
          pending.registration.stripeSubscriptionId = obj.subscription;
        }
        const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
        try {
          await provisionAndNotify(pending.registration, origin);
        } catch (e) {
          console.error("[billing] provisioning failed", e);
          return NextResponse.json({ error: "Provisioning failed" }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}

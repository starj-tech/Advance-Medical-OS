import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/server/billing/stripe";
import { takePending } from "@/server/billing/pending";
import { registerCompany } from "@/server/auth/store";

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

  let event: { type?: string; data?: { object?: { metadata?: { token?: string } } } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const token = event.data?.object?.metadata?.token;
    if (token) {
      const pending = await takePending(token);
      if (pending) {
        try {
          await registerCompany(pending.registration);
          // TODO: persist Stripe customer/subscription ids on the company and
          // email the generated Company ID + admin temp password to the PIC.
        } catch (e) {
          console.error("[billing] provisioning failed", e);
          return NextResponse.json({ error: "Provisioning failed" }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}

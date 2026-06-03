import { NextResponse } from "next/server";
import { registerCompany, RegisterError } from "@/server/auth/store";
import { planById } from "@/server/billing/plans";
import { createCheckoutSession, priceIdFor, stripeConfigured } from "@/server/billing/stripe";
import { savePending } from "@/server/billing/pending";

export const dynamic = "force-dynamic";

/**
 * Start checkout for a selected plan.
 * - Mock mode (no STRIPE_SECRET_KEY): provision immediately, return the result.
 * - Live mode: park the registration, create a Stripe Checkout Session, return
 *   its URL for the client to redirect to. Provisioning happens in the webhook.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const plan = planById(String(body?.plan ?? ""));
  const reg = body?.registration;

  if (!plan) {
    return NextResponse.json({ error: "Paket tidak dikenal." }, { status: 400 });
  }
  if (
    !reg?.legalName ||
    !reg?.picEmail ||
    !reg?.admin?.fullName ||
    !reg?.admin?.email ||
    !reg?.admin?.subRole
  ) {
    return NextResponse.json({ error: "Data pendaftaran tidak lengkap." }, { status: 400 });
  }
  reg.plan = plan.id;

  if (!stripeConfigured()) {
    try {
      const result = await registerCompany(reg);
      return NextResponse.json(
        {
          mode: "mock",
          companyCode: result.company.companyCode,
          adminTempPassword: result.adminTempPassword,
          employeeCount: result.employeeCount,
        },
        { status: 201 },
      );
    } catch (e) {
      if (e instanceof RegisterError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }
  }

  const priceId = priceIdFor(plan);
  if (!priceId) {
    return NextResponse.json(
      { error: "Paket ini belum tersedia untuk checkout otomatis. Hubungi tim sales." },
      { status: 400 },
    );
  }

  const token = await savePending(plan.id, reg);
  const origin = new URL(request.url).origin;
  const { url } = await createCheckoutSession({
    plan,
    priceId,
    quantity: plan.seats ?? 1,
    token,
    customerEmail: reg.picEmail,
    successUrl: `${origin}/billing/return?status=success`,
    cancelUrl: `${origin}/billing/return?status=cancel`,
  });
  return NextResponse.json({ mode: "stripe", url });
}

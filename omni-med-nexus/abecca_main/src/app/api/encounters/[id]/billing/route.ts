import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getEncounter } from "@/server/clinical/encounters";
import {
  addCharge,
  addPayment,
  billSummary,
  isPaymentMethod,
  normCategory,
} from "@/server/billing/charges";

export const dynamic = "force-dynamic";

/** Bill summary for an encounter: charges + payments + totals (IDR). */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("billing:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  return NextResponse.json(await billSummary(guard.session.company.id, id));
}

/** Add a charge (kind=charge) or record a payment (kind=payment). */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("billing:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;
  const encounter = await getEncounter(companyId, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

  const body = await request.json();

  if (body?.kind === "payment") {
    const amount = Number(body?.amount);
    if (!isPaymentMethod(body?.method) || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "valid method and positive amount required" }, { status: 400 });
    }
    const payment = await addPayment(companyId, id, encounter.patientId, {
      method: body.method,
      amount,
      receivedBy: guard.session.user.id,
    });
    return NextResponse.json(payment, { status: 201 });
  }

  // default: charge
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const unitPrice = Number(body?.unitPrice);
  if (!description || !Number.isFinite(unitPrice) || unitPrice < 0) {
    return NextResponse.json({ error: "description and a non-negative unitPrice required" }, { status: 400 });
  }
  const charge = await addCharge(companyId, id, encounter.patientId, {
    description,
    category: normCategory(body?.category),
    unitPrice,
    qty: Number.isFinite(Number(body?.qty)) ? Number(body.qty) : 1,
    createdBy: guard.session.user.id,
  });
  return NextResponse.json(charge, { status: 201 });
}

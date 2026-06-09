import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { listAllMedicationOrders } from "@/server/clinical/medication-orders";
import { listAllDispenses, recordDispense } from "@/server/pharmacy/dispenses";
import { buildPharmacyWorklist } from "@/server/pharmacy/worklist";
import { decrementStock } from "@/server/db";
import { notify } from "@/server/notify/center";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("formulary:read");
  if (guard.error) return guard.error;
  return NextResponse.json(await buildPharmacyWorklist(guard.session.company.id));
}

export async function POST(request: Request) {
  const guard = await requirePermission("formulary:dispense");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;

  const body = await request.json();
  const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  const quantity = Number.isFinite(body?.quantity) ? Math.max(1, Math.floor(body.quantity)) : 1;

  const orders = await listAllMedicationOrders(companyId);
  const order = orders.find((o) => o.id === orderId);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "active") {
    return NextResponse.json({ error: "Order is not active" }, { status: 409 });
  }

  // The loop closes once: guard against dispensing the same order twice.
  const dispenses = await listAllDispenses(companyId);
  if (dispenses.some((d) => d.orderId === orderId)) {
    return NextResponse.json({ error: "Order already dispensed" }, { status: 409 });
  }

  const dispense = await recordDispense(companyId, {
    orderId: order.id,
    encounterId: order.encounterId,
    patientId: order.patientId,
    formularyId: order.formularyId,
    drugName: order.drugName,
    quantity,
    dispensedBy: guard.session.user.id,
  });

  // Deplete the formulary line when the order is tied to a stocked item.
  let stockQuantity: number | null = null;
  if (order.formularyId != null) {
    const med = await decrementStock(order.formularyId, quantity);
    stockQuantity = med?.stockQuantity ?? null;
  }

  // Let the prescriber know the order has been dispensed.
  if (order.prescriberId && order.prescriberId !== guard.session.user.id) {
    await notify({
      companyId,
      userId: order.prescriberId,
      title: "Obat telah disiapkan farmasi",
      body: `${order.drugName} untuk pasien ${order.patientId} telah didispensing (${quantity}).`,
      type: "clinical",
    });
  }

  return NextResponse.json({ dispense, stockQuantity }, { status: 201 });
}

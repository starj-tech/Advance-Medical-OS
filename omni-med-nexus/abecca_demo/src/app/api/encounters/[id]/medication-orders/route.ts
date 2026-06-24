import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getEncounter } from "@/server/clinical/encounters";
import {
  activeDrugNames,
  createMedicationOrder,
  listMedicationOrders,
  setMedicationOrderStatus,
  type MedicationOrderStatus,
} from "@/server/clinical/medication-orders";
import { getPatient } from "@/server/db";
import { requiresOverride, screenPrescription } from "@/lib/drug-safety";
import { notify } from "@/server/notify/center";

export const dynamic = "force-dynamic";

const STATUSES: MedicationOrderStatus[] = ["active", "held", "stopped"];
const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("medication:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  return NextResponse.json(await listMedicationOrders(guard.session.company.id, id));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("medication:order");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;

  const encounter = await getEncounter(companyId, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

  const body = await request.json();
  const drugName = str(body?.drugName);
  if (!drugName) return NextResponse.json({ error: "drugName is required" }, { status: 400 });
  const overrideReason = str(body?.overrideReason);

  // Clinical decision support: screen against patient allergies + active meds.
  const patient = await getPatient(encounter.patientId);
  const active = await activeDrugNames(companyId, id);
  const alerts = screenPrescription({
    drugName,
    patientAllergies: patient?.allergies ?? [],
    activeDrugNames: active,
  });

  // Hard stop on a high-severity alert unless the prescriber records a reason.
  if (requiresOverride(alerts) && !overrideReason) {
    return NextResponse.json({ requiresOverride: true, alerts }, { status: 409 });
  }

  const order = await createMedicationOrder(companyId, id, {
    patientId: encounter.patientId,
    formularyId: typeof body?.formularyId === "number" ? body.formularyId : null,
    drugName,
    dose: str(body?.dose),
    route: str(body?.route),
    frequency: str(body?.frequency),
    prescriberId: guard.session.user.id,
    overrideReason,
  });

  // If the prescriber overrode a high-severity alert, notify the DPJP (unless they
  // are the prescriber) for awareness.
  if (
    overrideReason &&
    requiresOverride(alerts) &&
    encounter.dpjpUserId &&
    encounter.dpjpUserId !== guard.session.user.id
  ) {
    await notify({
      companyId,
      userId: encounter.dpjpUserId,
      title: "Override peringatan resep",
      body: `${guard.session.user.fullName} meresepkan ${order.drugName} melewati peringatan: ${overrideReason}`,
      type: "clinical",
    });
  }
  return NextResponse.json({ order, alerts }, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("medication:order");
  if (guard.error) return guard.error;
  await context.params; // encounter id not needed; order is addressed by its own id
  const body = await request.json();
  const orderId = str(body?.orderId);
  if (!orderId || !STATUSES.includes(body?.status)) {
    return NextResponse.json({ error: "orderId and a valid status are required" }, { status: 400 });
  }
  const updated = await setMedicationOrderStatus(guard.session.company.id, orderId, body.status);
  if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(updated);
}

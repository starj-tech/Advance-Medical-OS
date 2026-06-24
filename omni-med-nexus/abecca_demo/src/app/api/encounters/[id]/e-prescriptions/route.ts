import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getEncounter } from "@/server/clinical/encounters";
import { listMedicationOrders } from "@/server/clinical/medication-orders";
import {
  EPRESCRIPTION_STATUSES,
  issueEPrescription,
  listEPrescriptions,
  setEPrescriptionStatus,
  type EPrescriptionStatus,
} from "@/server/clinical/e-prescriptions";

export const dynamic = "force-dynamic";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("medication:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  return NextResponse.json(await listEPrescriptions(guard.session.company.id, id));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("medication:order");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;

  const encounter = await getEncounter(companyId, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

  // Snapshot the encounter's active CPOE orders into the prescription.
  const active = (await listMedicationOrders(companyId, id)).filter((o) => o.status === "active");
  if (active.length === 0) {
    return NextResponse.json(
      { error: "no active medication orders to prescribe" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const rx = await issueEPrescription(companyId, id, {
    patientId: encounter.patientId,
    pharmacy: str(body?.pharmacy),
    items: active.map((o) => ({
      drugName: o.drugName, dose: o.dose, route: o.route, frequency: o.frequency,
    })),
    issuedBy: guard.session.user.id,
  });
  return NextResponse.json(rx, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("medication:order");
  if (guard.error) return guard.error;
  await context.params; // encounter id not needed; prescription is addressed by its own id
  const body = await request.json();
  const prescriptionId = str(body?.prescriptionId);
  const status = body?.status as EPrescriptionStatus;
  if (!prescriptionId || !EPRESCRIPTION_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "prescriptionId and a valid status are required" },
      { status: 400 },
    );
  }
  const updated = await setEPrescriptionStatus(guard.session.company.id, prescriptionId, status);
  if (!updated) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
  return NextResponse.json(updated);
}

import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getEncounter } from "@/server/clinical/encounters";
import { listMedicationOrders } from "@/server/clinical/medication-orders";
import {
  listAdministrations,
  recordAdministration,
  type AdministrationStatus,
} from "@/server/clinical/medication-administrations";

export const dynamic = "force-dynamic";

const STATUSES: AdministrationStatus[] = ["given", "held", "refused", "missed"];
const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("mar:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  return NextResponse.json(await listAdministrations(guard.session.company.id, id));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("mar:administer");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;

  const encounter = await getEncounter(companyId, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

  const body = await request.json();
  const orderId = str(body?.orderId);
  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  if (body?.status && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  // The administered order must belong to this encounter/tenant.
  const orders = await listMedicationOrders(companyId, id);
  const order = orders.find((o) => o.id === orderId);
  if (!order) return NextResponse.json({ error: "Order not found on this encounter" }, { status: 404 });

  const admin = await recordAdministration(companyId, {
    orderId,
    encounterId: id,
    patientId: encounter.patientId,
    status: body?.status ?? "given",
    doseGiven: str(body?.doseGiven) ?? order.dose,
    note: str(body?.note),
    administeredBy: guard.session.user.id,
  });
  return NextResponse.json(admin, { status: 201 });
}

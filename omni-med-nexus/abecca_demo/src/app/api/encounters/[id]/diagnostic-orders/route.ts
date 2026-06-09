import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getEncounter } from "@/server/clinical/encounters";
import {
  createDiagnosticOrder,
  getDiagnosticOrder,
  isDiagnosticStatus,
  listDiagnosticOrders,
  setDiagnosticResult,
  setDiagnosticStatus,
} from "@/server/clinical/diagnostic-orders";
import { findTest } from "@/lib/diagnostic-catalog";
import { notify } from "@/server/notify/center";

export const dynamic = "force-dynamic";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("diagnostic:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  return NextResponse.json(await listDiagnosticOrders(guard.session.company.id, id));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("diagnostic:order");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;
  const encounter = await getEncounter(companyId, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

  const body = await request.json();
  const test = findTest(typeof body?.testCode === "string" ? body.testCode : "");
  if (!test) return NextResponse.json({ error: "Unknown testCode" }, { status: 400 });
  const priority = ["routine", "urgent", "stat"].includes(body?.priority) ? body.priority : "routine";

  const order = await createDiagnosticOrder(companyId, id, encounter.patientId, {
    category: test.category,
    testCode: test.code,
    testName: test.name,
    priority,
    orderedBy: guard.session.user.id,
  });
  return NextResponse.json(order, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("diagnostic:result");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;
  const body = await request.json();
  const orderId = str(body?.orderId);
  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

  const existing = await getDiagnosticOrder(companyId, orderId);
  if (!existing || existing.encounterId !== id) {
    return NextResponse.json({ error: "Order not found on this encounter" }, { status: 404 });
  }

  // Result entry takes precedence over a plain status change.
  const resultValue = str(body?.resultValue);
  if (resultValue) {
    const order = await setDiagnosticResult(companyId, orderId, {
      value: resultValue,
      note: str(body?.resultNote),
      resultedBy: guard.session.user.id,
    });
    // Close the loop: tell the DPJP the result is ready.
    const encounter = await getEncounter(companyId, id);
    if (encounter?.dpjpUserId) {
      await notify({
        companyId,
        userId: encounter.dpjpUserId,
        title: `Hasil ${existing.category === "lab" ? "lab" : "radiologi"} siap`,
        body: `${existing.testName}: ${resultValue} (pasien ${existing.patientId})`,
        type: "clinical",
      });
    }
    return NextResponse.json(order);
  }

  if (!isDiagnosticStatus(body?.status)) {
    return NextResponse.json({ error: "valid status or resultValue is required" }, { status: 400 });
  }
  const order = await setDiagnosticStatus(companyId, orderId, body.status);
  return NextResponse.json(order);
}

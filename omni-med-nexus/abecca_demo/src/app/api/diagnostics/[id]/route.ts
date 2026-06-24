import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getEncounter } from "@/server/clinical/encounters";
import {
  collectSpecimen,
  getDiagnosticOrder,
  setDiagnosticResult,
  setRadiologyReport,
  verifyDiagnostic,
} from "@/server/clinical/diagnostic-orders";
import { notify } from "@/server/notify/center";
import type { Permission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

// Worklist actions and the permission each requires. Collecting the specimen,
// entering a lab result and writing a radiology report are bench/reading work
// (diagnostic:result); validating is the pathologist's/radiologist's/head's
// authority (diagnostic:verify).
const PERM: Record<string, Permission> = {
  collect: "diagnostic:result",
  result: "diagnostic:result",
  report: "diagnostic:result",
  verify: "diagnostic:verify",
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const action = typeof body?.action === "string" ? body.action : "";
  const perm = PERM[action];
  if (!perm) return NextResponse.json({ error: "invalid action" }, { status: 400 });

  const guard = await requirePermission(perm);
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;

  const existing = await getDiagnosticOrder(companyId, id);
  if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (action === "collect") {
    return NextResponse.json(
      await collectSpecimen(companyId, id, { collectedBy: guard.session.user.id }),
    );
  }
  if (action === "verify") {
    return NextResponse.json(
      await verifyDiagnostic(companyId, id, { verifiedBy: guard.session.user.id }),
    );
  }

  if (action === "report") {
    const impression = str(body?.impression);
    if (!impression) {
      return NextResponse.json({ error: "impression is required" }, { status: 400 });
    }
    const order = await setRadiologyReport(companyId, id, {
      findings: str(body?.findings) ?? "",
      impression,
      recommendation: str(body?.recommendation),
      resultedBy: guard.session.user.id,
    });
    // Tell the DPJP the radiology read is ready.
    const encounter = await getEncounter(companyId, existing.encounterId);
    if (encounter?.dpjpUserId) {
      await notify({
        companyId,
        userId: encounter.dpjpUserId,
        title: "Hasil radiologi siap",
        body: `${existing.testName} — Kesan: ${impression} (pasien ${existing.patientId})`,
        type: "clinical",
      });
    }
    return NextResponse.json(order);
  }

  // action === "result"
  const resultValue = str(body?.resultValue);
  if (!resultValue) {
    return NextResponse.json({ error: "resultValue is required" }, { status: 400 });
  }
  const order = await setDiagnosticResult(companyId, id, {
    value: resultValue,
    note: str(body?.resultNote),
    resultedBy: guard.session.user.id,
  });

  // Close the loop to the DPJP — escalate critical (panic) values.
  const encounter = await getEncounter(companyId, existing.encounterId);
  if (encounter?.dpjpUserId) {
    const critical = order?.resultFlag === "critical";
    await notify({
      companyId,
      userId: encounter.dpjpUserId,
      title: critical ? "⚠ Nilai kritis (panic value)" : `Hasil ${existing.category === "lab" ? "lab" : "radiologi"} siap`,
      body: `${existing.testName}: ${resultValue}${critical ? " — NILAI KRITIS, segera tindak lanjuti" : ""} (pasien ${existing.patientId})`,
      type: "clinical",
    });
  }
  return NextResponse.json(order);
}

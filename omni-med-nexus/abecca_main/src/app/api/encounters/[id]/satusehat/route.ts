import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getEncounter, listDiagnoses } from "@/server/clinical/encounters";
import { listObservations } from "@/server/clinical/observations";
import { listMedicationOrders } from "@/server/clinical/medication-orders";
import { listDiagnosticOrders } from "@/server/clinical/diagnostic-orders";
import { postResource } from "@/server/satusehat/client";
import { listSubmissions, saveSubmission, type Submission } from "@/server/satusehat/submissions";
import {
  buildCondition,
  buildDiagnosticReport,
  buildEncounter,
  buildMedicationRequest,
  buildVitalsObservation,
  VITAL_LOINC,
  type FhirResource,
} from "@/lib/fhir";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("encounter:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  return NextResponse.json(await listSubmissions(guard.session.company.id, id));
}

/**
 * Build + submit the encounter's FHIR R4 bundle to SATUSEHAT:
 *   Encounter → Conditions → Observations (vitals) → MedicationRequests
 *   (active e-prescriptions) → DiagnosticReports (resulted lab/radiology).
 * Each resource is posted (env-gated real/mock client) and logged.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("encounter:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;
  const userId = guard.session.user.id;

  const encounter = await getEncounter(companyId, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

  const patientRef = `Patient/${encounter.patientId}`;
  const created: Submission[] = [];

  // Post a resource and record the submission in one step.
  const submit = async (resource: FhirResource) => {
    const res = await postResource(resource);
    created.push(
      await saveSubmission(companyId, id, encounter.patientId, {
        resourceType: res.resourceType,
        fhirId: res.fhirId || null,
        status: res.status,
        isMock: res.mock,
        error: res.error ?? null,
        createdBy: userId,
      }),
    );
    return res;
  };

  // 1) Encounter — its FHIR id anchors every child resource.
  const encRes = await submit(
    buildEncounter({
      encounterId: encounter.id,
      type: encounter.type,
      status: encounter.status,
      patientRef,
      startedAt: encounter.startedAt,
      endedAt: encounter.endedAt,
    }),
  );
  const encounterRef = `Encounter/${encRes.fhirId}`;

  // 2) Conditions (one per diagnosis).
  for (const dx of await listDiagnoses(companyId, id)) {
    await submit(buildCondition({ code: dx.code, display: dx.description, patientRef, encounterRef }));
  }

  // 3) Observations — the latest vital-signs set, one Observation per LOINC code.
  const obs = (await listObservations(companyId, id))[0];
  if (obs) {
    const values = obs as unknown as Record<string, number>;
    for (const v of VITAL_LOINC) {
      const value = values[v.key];
      if (typeof value === "number" && Number.isFinite(value)) {
        await submit(
          buildVitalsObservation({
            patientRef,
            encounterRef,
            loincCode: v.loincCode,
            display: v.display,
            value,
            unit: v.unit,
            effective: obs.recordedAt,
          }),
        );
      }
    }
  }

  // 4) MedicationRequests — active e-prescriptions on this encounter.
  for (const m of await listMedicationOrders(companyId, id)) {
    if (m.status === "stopped") continue;
    await submit(
      buildMedicationRequest({
        patientRef,
        encounterRef,
        drugName: m.drugName,
        dose: m.dose,
        route: m.route,
        frequency: m.frequency,
        status: m.status,
        authoredOn: m.createdAt,
      }),
    );
  }

  // 5) DiagnosticReports — resulted/verified lab & radiology orders.
  for (const d of await listDiagnosticOrders(companyId, id)) {
    if (d.status !== "resulted" && d.status !== "verified") continue;
    const conclusion = d.reportImpression || d.resultValue || "";
    await submit(
      buildDiagnosticReport({
        patientRef,
        encounterRef,
        category: d.category,
        testCode: d.testCode,
        testName: d.testName,
        conclusion,
        effective: d.resultedAt ?? encounter.startedAt,
        verified: d.status === "verified",
      }),
    );
  }

  return NextResponse.json({ submitted: created }, { status: 201 });
}

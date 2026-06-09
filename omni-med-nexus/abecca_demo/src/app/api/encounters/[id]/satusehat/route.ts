import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getEncounter, listDiagnoses } from "@/server/clinical/encounters";
import { postResource } from "@/server/satusehat/client";
import { listSubmissions, saveSubmission } from "@/server/satusehat/submissions";
import { buildCondition, buildEncounter } from "@/lib/fhir";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("encounter:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  return NextResponse.json(await listSubmissions(guard.session.company.id, id));
}

/** Build + submit the encounter's FHIR resources (Encounter, then Conditions). */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("encounter:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;
  const userId = guard.session.user.id;

  const encounter = await getEncounter(companyId, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

  const patientRef = `Patient/${encounter.patientId}`;
  const created = [];

  // 1) Encounter
  const encRes = await postResource(
    buildEncounter({
      encounterId: encounter.id,
      type: encounter.type,
      status: encounter.status,
      patientRef,
      startedAt: encounter.startedAt,
      endedAt: encounter.endedAt,
    }),
  );
  created.push(
    await saveSubmission(companyId, id, encounter.patientId, {
      resourceType: encRes.resourceType,
      fhirId: encRes.fhirId || null,
      status: encRes.status,
      isMock: encRes.mock,
      error: encRes.error ?? null,
      createdBy: userId,
    }),
  );

  // 2) Conditions (one per diagnosis), referencing the posted Encounter
  const encounterRef = `Encounter/${encRes.fhirId}`;
  const diagnoses = await listDiagnoses(companyId, id);
  for (const dx of diagnoses) {
    const condRes = await postResource(
      buildCondition({ code: dx.code, display: dx.description, patientRef, encounterRef }),
    );
    created.push(
      await saveSubmission(companyId, id, encounter.patientId, {
        resourceType: condRes.resourceType,
        fhirId: condRes.fhirId || null,
        status: condRes.status,
        isMock: condRes.mock,
        error: condRes.error ?? null,
        createdBy: userId,
      }),
    );
  }

  return NextResponse.json({ submitted: created }, { status: 201 });
}

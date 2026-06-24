import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getEncounter, listDiagnoses } from "@/server/clinical/encounters";
import { createClaim, isClaimStatus, latestClaim, setClaimStatus } from "@/server/billing/inacbg";
import { CARE_CLASSES, groupByDiagnosis, isCareClass, tariffForClass } from "@/lib/inacbg";

export const dynamic = "force-dynamic";

/** Pick the encounter's primary diagnosis code (rank=primary, else first). */
async function primaryDiagnosisCode(companyId: string, encounterId: string): Promise<string | null> {
  const dx = await listDiagnoses(companyId, encounterId);
  if (dx.length === 0) return null;
  return (dx.find((d) => d.rank === "primary") ?? dx[0]).code;
}

/** Grouping preview (CBG + tariff per class) + the latest saved claim. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("billing:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;
  const primary = await primaryDiagnosisCode(companyId, id);
  const group = groupByDiagnosis(primary);
  const tariffs = Object.fromEntries(
    CARE_CLASSES.map((c) => [c, tariffForClass(group, c)]),
  );
  const claim = await latestClaim(companyId, id);
  return NextResponse.json({
    preview: { primaryDiagnosis: primary, cbgCode: group.code, cbgDescription: group.description, tariffs },
    claim: claim ?? null,
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("billing:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;
  const encounter = await getEncounter(companyId, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

  const body = await request.json();
  if (!isCareClass(body?.careClass)) {
    return NextResponse.json({ error: "valid careClass required (3|2|1|vip)" }, { status: 400 });
  }
  const primary = await primaryDiagnosisCode(companyId, id);
  const claim = await createClaim(companyId, id, encounter.patientId, {
    primaryDiagnosis: primary,
    careClass: body.careClass,
    createdBy: guard.session.user.id,
  });
  return NextResponse.json(claim, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("billing:manage");
  if (guard.error) return guard.error;
  await context.params;
  const body = await request.json();
  const claimId = typeof body?.claimId === "string" ? body.claimId : "";
  if (!claimId || !isClaimStatus(body?.status)) {
    return NextResponse.json({ error: "claimId and a valid status required" }, { status: 400 });
  }
  const claim = await setClaimStatus(guard.session.company.id, claimId, body.status);
  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  return NextResponse.json(claim);
}

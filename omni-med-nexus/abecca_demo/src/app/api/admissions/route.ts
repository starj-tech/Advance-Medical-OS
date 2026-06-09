import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { admitInpatient } from "@/server/facility/admission";

export const dynamic = "force-dynamic";

/** Admit a patient to a free bed (creates the inpatient encounter + occupies the bed). */
export async function POST(request: Request) {
  const guard = await requirePermission("bed:manage");
  if (guard.error) return guard.error;

  const body = await request.json();
  const patientId = typeof body?.patientId === "string" ? body.patientId.trim() : "";
  const bedId = typeof body?.bedId === "string" ? body.bedId : "";
  if (!patientId || !bedId) {
    return NextResponse.json({ error: "patientId and bedId are required" }, { status: 400 });
  }
  const dpjpUserId = typeof body?.dpjpUserId === "string" && body.dpjpUserId.trim() ? body.dpjpUserId.trim() : null;

  const result = await admitInpatient(guard.session.company.id, { patientId, bedId, dpjpUserId });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ encounterId: result.encounter.id, bed: result.bed }, { status: 201 });
}

import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { isBedStatus, setBedStatus } from "@/server/facility/beds";

export const dynamic = "force-dynamic";

/** Change a bed's status, optionally assigning an occupant (patient/encounter). */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("bed:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const body = await request.json();
  if (!isBedStatus(body?.status)) {
    return NextResponse.json({ error: "valid status is required" }, { status: 400 });
  }
  const bed = await setBedStatus(guard.session.company.id, id, body.status, {
    patientId: typeof body?.patientId === "string" ? body.patientId : null,
    encounterId: typeof body?.encounterId === "string" ? body.encounterId : null,
  });
  if (!bed) return NextResponse.json({ error: "Bed not found" }, { status: 404 });
  return NextResponse.json(bed);
}

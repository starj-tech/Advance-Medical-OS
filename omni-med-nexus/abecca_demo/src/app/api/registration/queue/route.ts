import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createEncounter } from "@/server/clinical/encounters";
import { createTicket, listQueue } from "@/server/registration/queue";
import { isPolyclinic } from "@/lib/polyclinics";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("registration:read");
  if (guard.error) return guard.error;
  return NextResponse.json(await listQueue(guard.session.company.id));
}

export async function POST(request: Request) {
  const guard = await requirePermission("registration:write");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;

  const body = await request.json();
  const patientId = typeof body?.patientId === "string" ? body.patientId.trim() : "";
  if (!patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  if (!isPolyclinic(body?.polyclinic)) {
    return NextResponse.json({ error: "valid polyclinic is required" }, { status: 400 });
  }

  // Registration opens the visit: create the outpatient encounter, then the ticket.
  const encounter = await createEncounter(companyId, { patientId, type: "outpatient" });
  const ticket = await createTicket(companyId, {
    patientId,
    polyclinic: body.polyclinic,
    encounterId: encounter.id,
  });
  return NextResponse.json(ticket, { status: 201 });
}

import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import {
  createEncounter,
  listEncounters,
  type EncounterType,
} from "@/server/clinical/encounters";

export const dynamic = "force-dynamic";

const TYPES: EncounterType[] = ["outpatient", "inpatient", "ed", "odc"];

export async function GET(request: Request) {
  const guard = await requirePermission("encounter:read");
  if (guard.error) return guard.error;
  const patientId = new URL(request.url).searchParams.get("patientId");
  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }
  return NextResponse.json(await listEncounters(guard.session.company.id, patientId));
}

export async function POST(request: Request) {
  const guard = await requirePermission("encounter:write");
  if (guard.error) return guard.error;
  const body = await request.json();
  if (!body?.patientId || !TYPES.includes(body?.type)) {
    return NextResponse.json(
      { error: "patientId and a valid type are required" },
      { status: 400 },
    );
  }
  const encounter = await createEncounter(guard.session.company.id, {
    patientId: String(body.patientId),
    type: body.type,
    ward: body.ward ?? null,
    bed: body.bed ?? null,
    dpjpUserId: guard.session.user.id,
  });
  return NextResponse.json(encounter, { status: 201 });
}

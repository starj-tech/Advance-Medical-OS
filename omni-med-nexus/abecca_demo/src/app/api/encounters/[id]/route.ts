import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import {
  getEncounter,
  setEncounterStatus,
  type EncounterStatus,
} from "@/server/clinical/encounters";

export const dynamic = "force-dynamic";

const STATUSES: EncounterStatus[] = ["planned", "in_progress", "finished", "cancelled"];

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("encounter:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const encounter = await getEncounter(guard.session.company.id, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
  return NextResponse.json(encounter);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("encounter:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const body = await request.json();
  if (!STATUSES.includes(body?.status)) {
    return NextResponse.json({ error: "a valid status is required" }, { status: 400 });
  }
  const encounter = await setEncounterStatus(guard.session.company.id, id, body.status);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
  return NextResponse.json(encounter);
}

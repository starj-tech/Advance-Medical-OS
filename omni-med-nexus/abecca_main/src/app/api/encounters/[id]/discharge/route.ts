import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getEncounter, setEncounterStatus } from "@/server/clinical/encounters";
import {
  createDischargeSummary,
  getDischargeSummary,
  DISCHARGE_CONDITIONS,
  type DischargeCondition,
} from "@/server/clinical/discharge";

export const dynamic = "force-dynamic";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("discharge:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const summary = await getDischargeSummary(guard.session.company.id, id);
  return NextResponse.json(summary ?? null);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("discharge:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;

  const encounter = await getEncounter(companyId, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

  const existing = await getDischargeSummary(companyId, id);
  if (existing) return NextResponse.json({ error: "Already discharged" }, { status: 409 });

  const body = await request.json();
  const condition = body?.condition as DischargeCondition;
  if (!DISCHARGE_CONDITIONS.includes(condition)) {
    return NextResponse.json({ error: "a valid discharge condition is required" }, { status: 400 });
  }
  const clinicalSummary = str(body?.clinicalSummary);
  if (!clinicalSummary) {
    return NextResponse.json({ error: "clinicalSummary is required" }, { status: 400 });
  }

  const summary = await createDischargeSummary(companyId, id, {
    patientId: encounter.patientId,
    condition,
    clinicalSummary,
    treatment: str(body?.treatment),
    followUp: str(body?.followUp),
    dischargeMeds: str(body?.dischargeMeds),
    authoredBy: guard.session.user.id,
  });

  // Discharging closes the encounter.
  await setEncounterStatus(companyId, id, "finished");

  return NextResponse.json(summary, { status: 201 });
}

import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getEncounter } from "@/server/clinical/encounters";
import { listObservations, recordObservation } from "@/server/clinical/observations";
import { type Consciousness } from "@/lib/ews";
import { notify } from "@/server/notify/center";

export const dynamic = "force-dynamic";

const ACVPU: Consciousness[] = ["alert", "confusion", "voice", "pain", "unresponsive"];
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("vitals:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  return NextResponse.json(await listObservations(guard.session.company.id, id));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("vitals:record");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;

  const encounter = await getEncounter(companyId, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

  const body = await request.json();
  const respiratoryRate = num(body?.respiratoryRate);
  const spo2 = num(body?.spo2);
  const temperature = num(body?.temperature);
  const systolicBp = num(body?.systolicBp);
  const pulse = num(body?.pulse);
  if (
    respiratoryRate === null || spo2 === null || temperature === null ||
    systolicBp === null || pulse === null
  ) {
    return NextResponse.json(
      { error: "respiratoryRate, spo2, temperature, systolicBp and pulse are required numbers" },
      { status: 400 },
    );
  }
  const consciousness: Consciousness = ACVPU.includes(body?.consciousness) ? body.consciousness : "alert";

  const obs = await recordObservation(companyId, {
    encounterId: id,
    patientId: encounter.patientId,
    respiratoryRate, spo2, onOxygen: body?.onOxygen === true,
    temperature, systolicBp, pulse, consciousness,
    recordedBy: guard.session.user.id,
  });

  // Escalate a high EWS to the DPJP (skip when the recorder is the DPJP).
  if (obs.ewsBand === "high" && encounter.dpjpUserId && encounter.dpjpUserId !== guard.session.user.id) {
    await notify({
      companyId,
      userId: encounter.dpjpUserId,
      title: `EWS tinggi (${obs.ewsScore}) — ${encounter.patientId}`,
      body: `${guard.session.user.fullName} mencatat EWS ${obs.ewsScore} pada pasien ${encounter.patientId}. Tinjauan segera diperlukan.`,
      type: "clinical",
    });
  }

  return NextResponse.json(obs, { status: 201 });
}

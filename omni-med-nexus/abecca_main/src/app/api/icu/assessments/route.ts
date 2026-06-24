import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createIcuAssessment, listIcuAssessments } from "@/server/clinical/icu";
import type { ApacheInputs, ChronicHealth } from "@/lib/apache";

export const dynamic = "force-dynamic";

const NUMERIC: (keyof ApacheInputs)[] = [
  "temperatureC", "meanArterialPressure", "heartRate", "respiratoryRate", "pao2",
  "arterialPh", "sodium", "potassium", "creatinineMgDl", "hematocrit", "wbc", "gcs", "age",
];
const CHRONIC: ChronicHealth[] = ["none", "elective_postop", "nonop_or_emergency_postop"];

/** Coerce and validate the raw body into ApacheInputs, or null when invalid. */
function parseInputs(raw: unknown): ApacheInputs | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of NUMERIC) {
    const n = Number(src[key]);
    if (!Number.isFinite(n)) return null;
    out[key] = n;
  }
  out.acuteRenalFailure = Boolean(src.acuteRenalFailure);
  out.chronicHealth = CHRONIC.includes(src.chronicHealth as ChronicHealth)
    ? (src.chronicHealth as ChronicHealth)
    : "none";
  return out as unknown as ApacheInputs;
}

export async function GET() {
  const guard = await requirePermission("icu:read");
  if (guard.error) return guard.error;
  return NextResponse.json(await listIcuAssessments(guard.session.company.id));
}

export async function POST(request: Request) {
  const guard = await requirePermission("icu:assess");
  if (guard.error) return guard.error;
  const body = await request.json();
  const patientId = typeof body?.patientId === "string" ? body.patientId.trim() : "";
  const inputs = parseInputs(body?.inputs);
  if (!patientId || !inputs) {
    return NextResponse.json(
      { error: "patientId and complete numeric inputs are required" },
      { status: 400 },
    );
  }
  const assessment = await createIcuAssessment(guard.session.company.id, {
    patientId,
    encounterId: typeof body?.encounterId === "string" ? body.encounterId : null,
    inputs,
    assessedBy: guard.session.user.id,
  });
  return NextResponse.json(assessment, { status: 201 });
}

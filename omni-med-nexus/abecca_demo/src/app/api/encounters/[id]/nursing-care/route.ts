import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getEncounter } from "@/server/clinical/encounters";
import { addNursingCare, listNursingCare } from "@/server/clinical/nursing-care";

export const dynamic = "force-dynamic";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("nursing:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  return NextResponse.json(await listNursingCare(guard.session.company.id, id));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("nursing:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;

  const encounter = await getEncounter(companyId, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

  const body = await request.json();
  const nursingDiagnosis = str(body?.nursingDiagnosis);
  const goal = str(body?.goal);
  const intervention = str(body?.intervention);
  if (!nursingDiagnosis || !goal || !intervention) {
    return NextResponse.json(
      { error: "nursingDiagnosis, goal and intervention are required" },
      { status: 400 },
    );
  }

  const care = await addNursingCare(companyId, id, {
    patientId: encounter.patientId,
    nursingDiagnosis,
    goal,
    intervention,
    evaluation: str(body?.evaluation),
    authoredBy: guard.session.user.id,
  });
  return NextResponse.json(care, { status: 201 });
}

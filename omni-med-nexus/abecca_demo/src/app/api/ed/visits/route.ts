import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createEdVisit, edMetrics, listEdVisits } from "@/server/ed/triage";

export const dynamic = "force-dynamic";

/** The tracking board: active visits (acuity-sorted) + roll-up metrics. */
export async function GET(request: Request) {
  const guard = await requirePermission("registration:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const active = new URL(request.url).searchParams.get("active") === "1";
  const [visits, metrics] = await Promise.all([
    listEdVisits(companyId, { active }),
    edMetrics(companyId),
  ]);
  return NextResponse.json({ visits, metrics });
}

/** Triage a walk-in: ESI is recomputed server-side from the answers. */
export async function POST(request: Request) {
  const guard = await requirePermission("registration:write");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const patientId = typeof body?.patientId === "string" ? body.patientId.trim() : "";
  const complaint = typeof body?.complaint === "string" ? body.complaint.trim() : "";
  if (!patientId || !complaint) {
    return NextResponse.json({ error: "patientId dan keluhan wajib diisi" }, { status: 400 });
  }
  const visit = await createEdVisit(guard.session.company.id, {
    patientId,
    complaint,
    esi: {
      lifeSaving: !!body?.lifeSaving,
      highRisk: !!body?.highRisk,
      resources: Number(body?.resources) || 0,
      dangerVitals: !!body?.dangerVitals,
    },
    createdBy: guard.session.user.id,
  });
  return NextResponse.json(visit, { status: 201 });
}

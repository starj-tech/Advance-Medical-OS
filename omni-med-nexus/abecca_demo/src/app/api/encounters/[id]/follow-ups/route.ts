import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getEncounter } from "@/server/clinical/encounters";
import { createFollowUp, listFollowUps } from "@/server/clinical/follow-ups";

export const dynamic = "force-dynamic";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("note:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  return NextResponse.json(await listFollowUps(guard.session.company.id, id));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("note:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;

  const encounter = await getEncounter(companyId, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

  const body = await request.json();
  const dueDate = str(body?.dueDate);
  const reason = str(body?.reason);
  if (!dueDate || !reason) {
    return NextResponse.json({ error: "dueDate and reason are required" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(Date.parse(dueDate))) {
    return NextResponse.json({ error: "dueDate must be a valid YYYY-MM-DD date" }, { status: 400 });
  }

  const followUp = await createFollowUp(companyId, id, {
    patientId: encounter.patientId,
    dueDate,
    reason,
    patientPhone: str(body?.patientPhone),
    notifyUserId: encounter.dpjpUserId ?? null,
    createdBy: guard.session.user.id,
  });
  return NextResponse.json(followUp, { status: 201 });
}

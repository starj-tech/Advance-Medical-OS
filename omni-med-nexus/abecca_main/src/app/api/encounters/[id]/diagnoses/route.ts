import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import {
  addDiagnosis,
  listDiagnoses,
  type DiagnosisRank,
} from "@/server/clinical/encounters";

export const dynamic = "force-dynamic";

const RANKS: DiagnosisRank[] = ["primary", "secondary"];

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("diagnosis:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  return NextResponse.json(await listDiagnoses(guard.session.company.id, id));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("diagnosis:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const body = await request.json();
  if (!body?.code || !body?.description) {
    return NextResponse.json({ error: "code and description are required" }, { status: 400 });
  }
  const diagnosis = await addDiagnosis(guard.session.company.id, id, {
    code: String(body.code),
    description: String(body.description),
    rank: RANKS.includes(body?.rank) ? body.rank : "secondary",
    createdBy: guard.session.user.id,
  });
  if (!diagnosis) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
  return NextResponse.json(diagnosis, { status: 201 });
}

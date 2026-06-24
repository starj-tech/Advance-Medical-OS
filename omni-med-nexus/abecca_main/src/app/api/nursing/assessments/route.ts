import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { recordAssessment, listAssessments, assessmentSummary } from "@/server/clinical/nursing-assessments";
import type { ScaleKind } from "@/lib/nursing-scales";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const asScale = (v: unknown): ScaleKind | null => (v === "morse" || v === "braden" ? v : null);

export async function GET(request: Request) {
  const guard = await requirePermission("nursing:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const { searchParams } = new URL(request.url);
  const patientId = str(searchParams.get("patientId")) || undefined;
  const scale = asScale(searchParams.get("scale")) || undefined;
  const [assessments, summary] = await Promise.all([
    listAssessments(companyId, { patientId, scale }),
    assessmentSummary(companyId),
  ]);
  return NextResponse.json({ assessments, summary });
}

export async function POST(request: Request) {
  const guard = await requirePermission("nursing:write");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const patientId = str(body?.patientId);
  const patientName = str(body?.patientName);
  const scale = asScale(body?.scale);
  if (!patientId || !patientName) return NextResponse.json({ error: "Pasien wajib dipilih" }, { status: 400 });
  if (!scale) return NextResponse.json({ error: "Skala tidak dikenal" }, { status: 400 });

  const result = await recordAssessment(guard.session.company.id, {
    patientId, patientName, scale, items: body?.items, note: str(body?.note) || null,
    assessedBy: guard.session.user.id,
  });
  if (!result.ok) {
    return NextResponse.json({ error: "Jawaban skala tidak lengkap atau di luar rentang" }, { status: 422 });
  }
  return NextResponse.json(result.assessment, { status: 201 });
}

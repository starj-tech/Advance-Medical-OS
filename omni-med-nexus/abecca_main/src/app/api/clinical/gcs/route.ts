import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { recordGcs, listGcs, gcsSummary } from "@/server/clinical/gcs";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET(request: Request) {
  const guard = await requirePermission("nursing:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const { searchParams } = new URL(request.url);
  const patientId = str(searchParams.get("patientId")) || undefined;
  const [assessments, summary] = await Promise.all([listGcs(companyId, { patientId }), gcsSummary(companyId)]);
  return NextResponse.json({ assessments, summary });
}

export async function POST(request: Request) {
  const guard = await requirePermission("nursing:write");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const patientId = str(body?.patientId);
  const patientName = str(body?.patientName);
  if (!patientId || !patientName) return NextResponse.json({ error: "Pasien wajib dipilih" }, { status: 400 });

  const result = await recordGcs(guard.session.company.id, {
    patientId, patientName,
    components: { eye: body?.eye, verbal: body?.verbal, motor: body?.motor },
    note: str(body?.note) || null, assessedBy: guard.session.user.id,
  });
  if (!result.ok) {
    return NextResponse.json({ error: "Komponen GCS (E/V/M) di luar rentang" }, { status: 422 });
  }
  return NextResponse.json(result.assessment, { status: 201 });
}

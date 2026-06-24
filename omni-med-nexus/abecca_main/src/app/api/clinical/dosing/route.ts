import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { recordDoseCalc, listDoseCalcs } from "@/server/clinical/pediatric-dosing";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET(request: Request) {
  const guard = await requirePermission("medication:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const { searchParams } = new URL(request.url);
  const patientId = str(searchParams.get("patientId")) || undefined;
  return NextResponse.json({ calculations: await listDoseCalcs(companyId, { patientId }) });
}

export async function POST(request: Request) {
  const guard = await requirePermission("medication:order");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const patientId = str(body?.patientId);
  const patientName = str(body?.patientName);
  const drugCode = str(body?.drugCode);
  const weightKg = Number(body?.weightKg);
  if (!patientId || !patientName) return NextResponse.json({ error: "Pasien wajib dipilih" }, { status: 400 });

  const result = await recordDoseCalc(guard.session.company.id, {
    patientId, patientName, drugCode, weightKg, computedBy: guard.session.user.id,
  });
  if (!result.ok) {
    const map = {
      unknown_drug: { error: "Obat tidak dikenal", status: 400 },
      invalid_weight: { error: "Berat badan harus > 0 dan ≤ 100 kg", status: 422 },
    } as const;
    const m = map[result.reason];
    return NextResponse.json({ error: m.error }, { status: m.status });
  }
  return NextResponse.json(result.calculation, { status: 201 });
}

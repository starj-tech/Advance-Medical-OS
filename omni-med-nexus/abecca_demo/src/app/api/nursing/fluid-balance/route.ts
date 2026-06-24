import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { recordFluidEntry, listFluidEntries, fluidSummary } from "@/server/clinical/fluid-balance";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET(request: Request) {
  const guard = await requirePermission("nursing:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const { searchParams } = new URL(request.url);
  const patientId = str(searchParams.get("patientId")) || undefined;
  const [entries, summary] = await Promise.all([
    listFluidEntries(companyId, { patientId }),
    fluidSummary(companyId, { patientId }),
  ]);
  return NextResponse.json({ entries, summary });
}

export async function POST(request: Request) {
  const guard = await requirePermission("nursing:write");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const patientId = str(body?.patientId);
  const patientName = str(body?.patientName);
  const direction = body?.direction === "intake" || body?.direction === "output" ? body.direction : null;
  const type = str(body?.type);
  const volumeMl = Number(body?.volumeMl);
  if (!patientId || !patientName) return NextResponse.json({ error: "Pasien wajib dipilih" }, { status: 400 });
  if (!direction) return NextResponse.json({ error: "Arah (intake/output) tidak dikenal" }, { status: 400 });

  const result = await recordFluidEntry(guard.session.company.id, {
    patientId, patientName, direction, type, volumeMl, note: str(body?.note) || null,
    recordedBy: guard.session.user.id,
  });
  if (!result.ok) {
    const map = {
      invalid_type: { error: "Jenis cairan tidak sesuai arahnya", status: 422 },
      invalid_volume: { error: "Volume harus bilangan bulat > 0 (mL)", status: 422 },
    } as const;
    const m = map[result.reason];
    return NextResponse.json({ error: m.error }, { status: m.status });
  }
  return NextResponse.json(result.entry, { status: 201 });
}

import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { recordHandover, listHandovers, handoverSummary } from "@/server/clinical/handovers";
import type { HandoverStatus } from "@/lib/sbar";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const asStatus = (v: unknown): HandoverStatus | null => (v === "pending" || v === "acknowledged" ? v : null);

export async function GET(request: Request) {
  const guard = await requirePermission("nursing:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const { searchParams } = new URL(request.url);
  const patientId = str(searchParams.get("patientId")) || undefined;
  const status = asStatus(searchParams.get("status")) || undefined;
  const [handovers, summary] = await Promise.all([
    listHandovers(companyId, { patientId, status }),
    handoverSummary(companyId),
  ]);
  return NextResponse.json({ handovers, summary });
}

export async function POST(request: Request) {
  const guard = await requirePermission("nursing:write");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const patientId = str(body?.patientId);
  const patientName = str(body?.patientName);
  const fromStaff = str(body?.fromStaff);
  if (!patientId || !patientName) return NextResponse.json({ error: "Pasien wajib dipilih" }, { status: 400 });
  if (!fromStaff) return NextResponse.json({ error: "Perawat pemberi handover wajib diisi" }, { status: 400 });

  const result = await recordHandover(guard.session.company.id, {
    patientId, patientName, fromStaff, toStaff: str(body?.toStaff) || null, shift: str(body?.shift) || null,
    situation: str(body?.situation), background: str(body?.background),
    assessment: str(body?.assessment), recommendation: str(body?.recommendation),
  });
  if (!result.ok) {
    return NextResponse.json({ error: "Semua bagian SBAR (S/B/A/R) wajib diisi" }, { status: 422 });
  }
  return NextResponse.json(result.handover, { status: 201 });
}

import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { updateRisk } from "@/server/quality/risk-register";
import { RISK_STATUS_LABEL, type RiskStatus } from "@/lib/risk-matrix";

export const dynamic = "force-dynamic";

const isStatus = (v: unknown): v is RiskStatus => typeof v === "string" && v in RISK_STATUS_LABEL;
const isAxis = (n: number): boolean => Number.isFinite(n) && n >= 1 && n <= 5;

/** Re-assess (likelihood/consequence → re-scored), reassign owner/mitigation, or advance status. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("ikp:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const patch: { status?: RiskStatus; likelihood?: number; consequence?: number; owner?: string | null; mitigation?: string | null } = {};
  if (body?.status !== undefined) {
    if (!isStatus(body.status)) return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    patch.status = body.status;
  }
  if (body?.likelihood !== undefined) {
    const n = Number(body.likelihood);
    if (!isAxis(n)) return NextResponse.json({ error: "Kemungkinan harus 1–5" }, { status: 400 });
    patch.likelihood = n;
  }
  if (body?.consequence !== undefined) {
    const n = Number(body.consequence);
    if (!isAxis(n)) return NextResponse.json({ error: "Dampak harus 1–5" }, { status: 400 });
    patch.consequence = n;
  }
  if (typeof body?.owner === "string") patch.owner = body.owner.trim() || null;
  if (typeof body?.mitigation === "string") patch.mitigation = body.mitigation.trim() || null;

  const risk = await updateRisk(guard.session.company.id, id, patch);
  if (!risk) return NextResponse.json({ error: "Risiko tidak ditemukan" }, { status: 404 });
  return NextResponse.json(risk);
}

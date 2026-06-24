import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createRisk, listRisks, riskSummary } from "@/server/quality/risk-register";
import { RISK_CATEGORY_LABEL, type RiskCategory } from "@/lib/risk-matrix";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const isCategory = (v: unknown): v is RiskCategory => typeof v === "string" && v in RISK_CATEGORY_LABEL;
const isAxis = (n: number): boolean => Number.isFinite(n) && n >= 1 && n <= 5;

export async function GET() {
  const guard = await requirePermission("ikp:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const [risks, summary] = await Promise.all([listRisks(companyId), riskSummary(companyId)]);
  return NextResponse.json({ risks, summary });
}

export async function POST(request: Request) {
  const guard = await requirePermission("ikp:manage");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const title = str(body?.title);
  if (!title) return NextResponse.json({ error: "Judul risiko wajib diisi" }, { status: 400 });
  if (!isCategory(body?.category)) return NextResponse.json({ error: "Kategori tidak valid" }, { status: 400 });
  const likelihood = Number(body?.likelihood);
  const consequence = Number(body?.consequence);
  if (!isAxis(likelihood) || !isAxis(consequence)) {
    return NextResponse.json({ error: "Kemungkinan & dampak harus 1–5" }, { status: 400 });
  }
  const risk = await createRisk(guard.session.company.id, {
    title, category: body.category, description: str(body?.description) || null,
    likelihood, consequence, owner: str(body?.owner) || null, mitigation: str(body?.mitigation) || null,
    createdBy: guard.session.user.id,
  });
  return NextResponse.json(risk, { status: 201 });
}

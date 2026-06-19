import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { updatePayer } from "@/server/billing/payers";
import { isEligibility } from "@/lib/payers";

export const dynamic = "force-dynamic";

/** Update a payer's coverage policy, eligibility, or active flag. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("billing:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const patch: {
    coveragePercent?: number; deductible?: number; copay?: number;
    ceiling?: number | null; eligibilityStatus?: "eligible" | "ineligible" | "pending" | "unknown"; active?: boolean;
  } = {};

  if (body?.coveragePercent !== undefined) {
    const n = Number(body.coveragePercent);
    if (!Number.isFinite(n) || n < 0 || n > 100) return NextResponse.json({ error: "Persentase 0–100" }, { status: 400 });
    patch.coveragePercent = n;
  }
  if (body?.deductible !== undefined) patch.deductible = Number(body.deductible) || 0;
  if (body?.copay !== undefined) patch.copay = Number(body.copay) || 0;
  if (body?.ceiling !== undefined) {
    patch.ceiling = body.ceiling === null || body.ceiling === "" ? null : Number(body.ceiling) || 0;
  }
  if (body?.eligibilityStatus !== undefined) {
    if (!isEligibility(body.eligibilityStatus)) return NextResponse.json({ error: "Status eligibilitas tidak valid" }, { status: 400 });
    patch.eligibilityStatus = body.eligibilityStatus;
  }
  if (typeof body?.active === "boolean") patch.active = body.active;

  const payer = await updatePayer(guard.session.company.id, id, patch);
  if (!payer) return NextResponse.json({ error: "Penjamin tidak ditemukan" }, { status: 404 });
  return NextResponse.json(payer);
}

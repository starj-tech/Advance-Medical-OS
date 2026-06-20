import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { withdrawConsent } from "@/server/clinical/consent";

export const dynamic = "force-dynamic";

/** Withdraw a consent (non-destructive). */
export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("patient:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const rec = await withdrawConsent(guard.session.company.id, id);
  if (!rec) return NextResponse.json({ error: "Consent tidak ditemukan" }, { status: 404 });
  return NextResponse.json(rec);
}

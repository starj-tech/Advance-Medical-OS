import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getPurchaseOrder, setPoStatus } from "@/server/pharmacy/procurement";
import { PO_STATUS_LABEL, type PoStatus } from "@/lib/procurement";

export const dynamic = "force-dynamic";

const isPoStatus = (v: unknown): v is PoStatus => typeof v === "string" && v in PO_STATUS_LABEL;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("procurement:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const po = await getPurchaseOrder(guard.session.company.id, id);
  if (!po) return NextResponse.json({ error: "PO tidak ditemukan" }, { status: 404 });
  return NextResponse.json(po);
}

/** Move a PO through its lifecycle (draft → sent, or cancel). */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("procurement:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  if (!isPoStatus(body?.status)) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }
  const po = await setPoStatus(guard.session.company.id, id, body.status);
  if (!po) return NextResponse.json({ error: "PO tidak ditemukan" }, { status: 404 });
  return NextResponse.json(po);
}

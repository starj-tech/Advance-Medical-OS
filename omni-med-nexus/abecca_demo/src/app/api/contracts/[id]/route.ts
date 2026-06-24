import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { updateContract } from "@/server/procurement/contracts";
import { isContractStatus } from "@/lib/contracts";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Update status (renew/terminate), value, dates, or notes. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("procurement:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const patch: { status?: "active" | "terminated"; value?: number; startDate?: string | null; endDate?: string | null; notes?: string | null } = {};
  if (body?.status !== undefined) {
    if (!isContractStatus(body.status)) return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    patch.status = body.status;
  }
  if (body?.value !== undefined) {
    const v = Number(body.value);
    if (!Number.isFinite(v) || v < 0) return NextResponse.json({ error: "Nilai kontrak tidak valid" }, { status: 400 });
    patch.value = v;
  }
  for (const key of ["startDate", "endDate"] as const) {
    if (body?.[key] !== undefined) {
      const raw = typeof body[key] === "string" ? body[key].trim() : "";
      if (raw && !DATE_RE.test(raw)) return NextResponse.json({ error: "Tanggal harus YYYY-MM-DD" }, { status: 400 });
      patch[key] = raw || null;
    }
  }
  if (typeof body?.notes === "string") patch.notes = body.notes.trim() || null;

  const c = await updateContract(guard.session.company.id, id, patch);
  if (!c) return NextResponse.json({ error: "Kontrak tidak ditemukan" }, { status: 404 });
  return NextResponse.json(c);
}

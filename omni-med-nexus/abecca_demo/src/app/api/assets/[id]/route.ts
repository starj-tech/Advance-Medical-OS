import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { updateAsset } from "@/server/biomedical/assets";
import { isAssetStatus } from "@/lib/biomedical";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Update operational status, location, or the calibration/maintenance schedule. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("device:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const patch: { status?: "operational" | "maintenance" | "broken" | "retired"; location?: string; lastMaintenance?: string | null; nextDue?: string | null; notes?: string | null } = {};
  if (body?.status !== undefined) {
    if (!isAssetStatus(body.status)) return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    patch.status = body.status;
  }
  if (typeof body?.location === "string" && body.location.trim()) patch.location = body.location.trim();
  for (const key of ["lastMaintenance", "nextDue"] as const) {
    if (body?.[key] !== undefined) {
      const v = typeof body[key] === "string" ? body[key].trim() : "";
      if (v && !DATE_RE.test(v)) return NextResponse.json({ error: "Tanggal harus YYYY-MM-DD" }, { status: 400 });
      patch[key] = v || null;
    }
  }
  if (typeof body?.notes === "string") patch.notes = body.notes.trim() || null;

  const a = await updateAsset(guard.session.company.id, id, patch);
  if (!a) return NextResponse.json({ error: "Aset tidak ditemukan" }, { status: 404 });
  return NextResponse.json(a);
}

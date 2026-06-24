import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { markSeen, setDisposition } from "@/server/ed/triage";
import { isEdDisposition } from "@/lib/ed";

export const dynamic = "force-dynamic";

/** Advance a visit: mark first doctor contact, or set the disposition. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("encounter:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;
  const body = await request.json().catch(() => ({}));

  if (body?.action === "seen") {
    const visit = await markSeen(companyId, id);
    if (!visit) return NextResponse.json({ error: "Kunjungan tidak ditemukan" }, { status: 404 });
    return NextResponse.json(visit);
  }
  if (body?.action === "disposition") {
    if (!isEdDisposition(body?.disposition)) {
      return NextResponse.json({ error: "disposisi tidak valid" }, { status: 400 });
    }
    const visit = await setDisposition(companyId, id, body.disposition);
    if (!visit) return NextResponse.json({ error: "Kunjungan tidak ditemukan" }, { status: 404 });
    return NextResponse.json(visit);
  }
  return NextResponse.json({ error: "action tidak dikenal" }, { status: 400 });
}

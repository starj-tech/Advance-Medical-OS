import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { acknowledgeHandover } from "@/server/clinical/handovers";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("nursing:write");
  if (guard.error) return guard.error;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (body?.action !== "acknowledge") {
    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  }
  const result = await acknowledgeHandover(guard.session.company.id, id, { acknowledgedBy: guard.session.user.id });
  if (!result.ok) {
    const map = {
      not_found: { error: "Handover tidak ditemukan", status: 404 },
      already_acknowledged: { error: "Handover sudah dikonfirmasi", status: 409 },
    } as const;
    const m = map[result.reason];
    return NextResponse.json({ error: m.error }, { status: m.status });
  }
  return NextResponse.json(result.handover);
}

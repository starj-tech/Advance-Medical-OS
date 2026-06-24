import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { withdrawRecall } from "@/server/pharmacy/recall";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("formulary:dispense");
  if (guard.error) return guard.error;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (body?.action !== "withdraw") {
    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  }
  const result = await withdrawRecall(guard.session.company.id, id);
  if (!result.ok) {
    const map = {
      not_found: { error: "Penarikan tidak ditemukan", status: 404 },
      already_completed: { error: "Penarikan sudah dieksekusi", status: 409 },
    } as const;
    const m = map[result.reason];
    return NextResponse.json({ error: m.error }, { status: m.status });
  }
  return NextResponse.json(result.recall);
}

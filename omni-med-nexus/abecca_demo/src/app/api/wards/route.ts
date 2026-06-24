import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createWard, listWards } from "@/server/facility/beds";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("bed:read");
  if (guard.error) return guard.error;
  return NextResponse.json(await listWards(guard.session.company.id));
}

export async function POST(request: Request) {
  const guard = await requirePermission("bed:manage");
  if (guard.error) return guard.error;
  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const ward = await createWard(guard.session.company.id, {
    name,
    wardClass: typeof body?.wardClass === "string" ? body.wardClass.trim() || null : null,
  });
  return NextResponse.json(ward, { status: 201 });
}

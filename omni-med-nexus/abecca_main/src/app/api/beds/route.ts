import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { boardSummary, createBed } from "@/server/facility/beds";

export const dynamic = "force-dynamic";

/** Per-ward occupancy board with BOR. */
export async function GET() {
  const guard = await requirePermission("bed:read");
  if (guard.error) return guard.error;
  return NextResponse.json(await boardSummary(guard.session.company.id));
}

export async function POST(request: Request) {
  const guard = await requirePermission("bed:manage");
  if (guard.error) return guard.error;
  const body = await request.json();
  const wardId = typeof body?.wardId === "string" ? body.wardId : "";
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  if (!wardId || !label) {
    return NextResponse.json({ error: "wardId and label are required" }, { status: 400 });
  }
  const bed = await createBed(guard.session.company.id, { wardId, label });
  return NextResponse.json(bed, { status: 201 });
}

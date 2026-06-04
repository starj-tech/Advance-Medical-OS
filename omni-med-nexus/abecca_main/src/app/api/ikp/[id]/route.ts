import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { isGrading, isIkpStatus, updateReport } from "@/server/safety/ikp";

export const dynamic = "force-dynamic";

/** Committee action: set risk grading and/or advance investigation status. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("ikp:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const body = await request.json();
  if (body?.grading !== undefined && !isGrading(body.grading)) {
    return NextResponse.json({ error: "invalid grading" }, { status: 400 });
  }
  if (body?.status !== undefined && !isIkpStatus(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  if (body?.grading === undefined && body?.status === undefined) {
    return NextResponse.json({ error: "grading or status required" }, { status: 400 });
  }
  const report = await updateReport(guard.session.company.id, id, {
    grading: isGrading(body?.grading) ? body.grading : undefined,
    status: isIkpStatus(body?.status) ? body.status : undefined,
  });
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  return NextResponse.json(report);
}

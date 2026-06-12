import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import {
  createChemoCourse,
  listChemoCourses,
  recordChemoCycle,
  stopChemoCourse,
} from "@/server/clinical/chemo";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("chemo:read");
  if (guard.error) return guard.error;
  return NextResponse.json(await listChemoCourses(guard.session.company.id));
}

export async function POST(request: Request) {
  const guard = await requirePermission("chemo:manage");
  if (guard.error) return guard.error;
  const body = await request.json();
  const patientId = typeof body?.patientId === "string" ? body.patientId.trim() : "";
  const regimenCode = typeof body?.regimenCode === "string" ? body.regimenCode : "";
  if (!patientId || !regimenCode) {
    return NextResponse.json({ error: "patientId and regimenCode are required" }, { status: 400 });
  }
  const course = await createChemoCourse(guard.session.company.id, {
    patientId,
    regimenCode,
    startedBy: guard.session.user.id,
  });
  if (!course) return NextResponse.json({ error: "Unknown regimenCode" }, { status: 400 });
  return NextResponse.json(course, { status: 201 });
}

/** {courseId, action: "cycle" | "stop"} — record an administered cycle or stop the course. */
export async function PATCH(request: Request) {
  const guard = await requirePermission("chemo:manage");
  if (guard.error) return guard.error;
  const body = await request.json();
  const courseId = typeof body?.courseId === "string" ? body.courseId : "";
  const action = body?.action === "cycle" || body?.action === "stop" ? body.action : null;
  if (!courseId || !action) {
    return NextResponse.json({ error: "courseId and valid action are required" }, { status: 400 });
  }
  const companyId = guard.session.company.id;
  const course =
    action === "cycle"
      ? await recordChemoCycle(companyId, courseId)
      : await stopChemoCourse(companyId, courseId);
  if (!course) {
    return NextResponse.json({ error: "Course not found or not active" }, { status: 404 });
  }
  return NextResponse.json(course);
}

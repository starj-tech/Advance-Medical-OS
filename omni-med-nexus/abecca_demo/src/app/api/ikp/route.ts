import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createReport, isIncidentType, listReports } from "@/server/safety/ikp";

export const dynamic = "force-dynamic";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

export async function GET() {
  const guard = await requirePermission("ikp:read");
  if (guard.error) return guard.error;
  return NextResponse.json(await listReports(guard.session.company.id));
}

export async function POST(request: Request) {
  const guard = await requirePermission("ikp:report");
  if (guard.error) return guard.error;
  const body = await request.json();
  const title = str(body?.title);
  if (!isIncidentType(body?.incidentType) || !title) {
    return NextResponse.json({ error: "incidentType and title are required" }, { status: 400 });
  }
  const report = await createReport(guard.session.company.id, {
    incidentType: body.incidentType,
    title,
    description: str(body?.description),
    location: str(body?.location),
    patientId: str(body?.patientId),
    incidentDate: str(body?.incidentDate),
    reportedBy: guard.session.user.id,
  });
  return NextResponse.json(report, { status: 201 });
}

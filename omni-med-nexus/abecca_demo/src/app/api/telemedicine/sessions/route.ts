import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import {
  createTeleSession,
  listTeleSessions,
  setTeleStatus,
} from "@/server/clinical/telemedicine";
import { isTeleStatus } from "@/lib/telemedicine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requirePermission("telemedicine:read");
  if (guard.error) return guard.error;
  const status = new URL(request.url).searchParams.get("status");
  return NextResponse.json(
    await listTeleSessions(guard.session.company.id, {
      status: isTeleStatus(status) ? status : undefined,
    }),
  );
}

export async function POST(request: Request) {
  const guard = await requirePermission("telemedicine:manage");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const patientId = typeof body?.patientId === "string" ? body.patientId.trim() : "";
  const scheduledAt = typeof body?.scheduledAt === "string" ? body.scheduledAt : "";
  if (!patientId || !scheduledAt) {
    return NextResponse.json({ error: "patientId and scheduledAt are required" }, { status: 400 });
  }
  const session = await createTeleSession(guard.session.company.id, {
    patientId,
    encounterId: typeof body?.encounterId === "string" ? body.encounterId : null,
    appointmentId: typeof body?.appointmentId === "string" ? body.appointmentId : null,
    scheduledAt,
    clinicianId: guard.session.user.id,
    note: typeof body?.note === "string" && body.note.trim() ? body.note.trim() : null,
  });
  return NextResponse.json(session, { status: 201 });
}

/** Advance session status: { sessionId, status }. */
export async function PATCH(request: Request) {
  const guard = await requirePermission("telemedicine:manage");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  if (!sessionId || !isTeleStatus(body?.status)) {
    return NextResponse.json({ error: "sessionId and valid status are required" }, { status: 400 });
  }
  const result = await setTeleStatus(guard.session.company.id, sessionId, body.status);
  if (!result) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if ("error" in result) return NextResponse.json(result, { status: 409 });
  return NextResponse.json(result);
}

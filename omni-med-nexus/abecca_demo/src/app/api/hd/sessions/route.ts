import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import {
  findHdConflict,
  getHdMachine,
  isHdShift,
  listHdSessions,
  scheduleHdSession,
  setHdSessionStatus,
} from "@/server/clinical/hemodialysis";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const guard = await requirePermission("hd:read");
  if (guard.error) return guard.error;
  const date = new URL(request.url).searchParams.get("date");
  return NextResponse.json(
    await listHdSessions(guard.session.company.id, {
      date: date && DATE_RE.test(date) ? date : undefined,
    }),
  );
}

export async function POST(request: Request) {
  const guard = await requirePermission("hd:manage");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const body = await request.json();
  const patientId = typeof body?.patientId === "string" ? body.patientId.trim() : "";
  const machineId = typeof body?.machineId === "string" ? body.machineId : "";
  const date = typeof body?.date === "string" && DATE_RE.test(body.date) ? body.date : "";
  if (!patientId || !machineId || !date || !isHdShift(body?.shift)) {
    return NextResponse.json(
      { error: "patientId, machineId, date (YYYY-MM-DD) and shift are required" },
      { status: 400 },
    );
  }

  const machine = await getHdMachine(companyId, machineId);
  if (!machine) return NextResponse.json({ error: "Machine not found" }, { status: 404 });
  if (machine.status === "maintenance") {
    return NextResponse.json(
      { error: `Mesin ${machine.name} sedang maintenance` },
      { status: 409 },
    );
  }
  const conflict = await findHdConflict(companyId, machineId, date, body.shift);
  if (conflict) {
    return NextResponse.json(
      { error: `Mesin ${machine.name} sudah terisi (pasien ${conflict.patientId}) pada ${date} shift ${body.shift}` },
      { status: 409 },
    );
  }

  const session = await scheduleHdSession(companyId, {
    patientId,
    machineId,
    machineName: machine.name,
    date,
    shift: body.shift,
    durationHours: Number(body?.durationHours) || undefined,
    note: typeof body?.note === "string" && body.note.trim() ? body.note.trim() : null,
    createdBy: guard.session.user.id,
  });
  return NextResponse.json(session, { status: 201 });
}

export async function PATCH(request: Request) {
  const guard = await requirePermission("hd:manage");
  if (guard.error) return guard.error;
  const body = await request.json();
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const status =
    body?.status === "completed" || body?.status === "cancelled" || body?.status === "scheduled"
      ? body.status
      : null;
  if (!sessionId || !status) {
    return NextResponse.json({ error: "sessionId and valid status are required" }, { status: 400 });
  }
  const session = await setHdSessionStatus(guard.session.company.id, sessionId, status);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json(session);
}

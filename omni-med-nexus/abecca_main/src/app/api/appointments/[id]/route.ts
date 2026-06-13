import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import {
  APPOINTMENT_STATUSES,
  getAppointment,
  setAppointmentStatus,
  type AppointmentStatus,
} from "@/server/scheduling/appointments";
import { checkInAppointment } from "@/server/scheduling/appointment-flow";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("registration:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;

  const body = await request.json();
  const status = body?.status as AppointmentStatus;
  if (!APPOINTMENT_STATUSES.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  // Check-in closes the loop. An in-person appointment is pushed into today's
  // poliklinik antrian (a queue ticket); a telemedicine appointment admits the
  // patient to the virtual waiting room (its video session → waiting).
  if (status === "checked_in") {
    const result = await checkInAppointment(companyId, id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({
      appointment: result.appointment,
      ticket: result.ticket,
      teleSession: result.teleSession,
    });
  }

  const appt = await getAppointment(companyId, id);
  if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  const appointment = await setAppointmentStatus(companyId, id, status);
  return NextResponse.json({ appointment });
}

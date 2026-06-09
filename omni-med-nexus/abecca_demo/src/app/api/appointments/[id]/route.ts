import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import {
  APPOINTMENT_STATUSES,
  getAppointment,
  setAppointmentStatus,
  type AppointmentStatus,
} from "@/server/scheduling/appointments";
import { createTicket } from "@/server/registration/queue";

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

  const appt = await getAppointment(companyId, id);
  if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  // Check-in closes the loop: the patient who arrives for a scheduled appointment
  // is pushed into today's poliklinik antrian (a queue ticket), and the ticket is
  // recorded on the appointment.
  if (status === "checked_in") {
    if (appt.status !== "scheduled") {
      return NextResponse.json(
        { error: "only a scheduled appointment can be checked in" },
        { status: 409 },
      );
    }
    const ticket = await createTicket(companyId, {
      patientId: appt.patientId,
      polyclinic: appt.polyclinic,
    });
    const appointment = await setAppointmentStatus(companyId, id, "checked_in", ticket.id);
    return NextResponse.json({ appointment, ticket });
  }

  const appointment = await setAppointmentStatus(companyId, id, status);
  return NextResponse.json({ appointment });
}

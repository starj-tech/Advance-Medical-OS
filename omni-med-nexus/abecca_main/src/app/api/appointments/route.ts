import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { listAppointments } from "@/server/scheduling/appointments";
import { bookAppointment, listAppointmentsWithTele } from "@/server/scheduling/appointment-flow";
import { isPolyclinic } from "@/lib/polyclinics";
import { isAppointmentModality } from "@/lib/appointments";

export const dynamic = "force-dynamic";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

export async function GET() {
  const guard = await requirePermission("registration:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  return NextResponse.json(
    await listAppointmentsWithTele(companyId, await listAppointments(companyId)),
  );
}

export async function POST(request: Request) {
  const guard = await requirePermission("registration:write");
  if (guard.error) return guard.error;

  const body = await request.json();
  const patientId = str(body?.patientId);
  const polyclinic = str(body?.polyclinic);
  const scheduledAt = str(body?.scheduledAt);
  if (!patientId || !polyclinic || !scheduledAt) {
    return NextResponse.json(
      { error: "patientId, polyclinic and scheduledAt are required" },
      { status: 400 },
    );
  }
  if (!isPolyclinic(polyclinic)) {
    return NextResponse.json({ error: "unknown polyclinic" }, { status: 400 });
  }
  if (Number.isNaN(Date.parse(scheduledAt))) {
    return NextResponse.json({ error: "scheduledAt must be a valid date-time" }, { status: 400 });
  }
  const modality = isAppointmentModality(body?.modality) ? body.modality : "in_person";

  const appointment = await bookAppointment(guard.session.company.id, {
    patientId, polyclinic, practitioner: str(body?.practitioner), scheduledAt, modality,
    notes: str(body?.notes), createdBy: guard.session.user.id,
  });
  return NextResponse.json(appointment, { status: 201 });
}

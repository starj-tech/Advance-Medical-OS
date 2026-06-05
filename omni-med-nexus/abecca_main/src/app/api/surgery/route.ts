import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createBooking, listBookings } from "@/server/surgery/schedule";

export const dynamic = "force-dynamic";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

export async function GET() {
  const guard = await requirePermission("surgery:read");
  if (guard.error) return guard.error;
  return NextResponse.json(await listBookings(guard.session.company.id));
}

export async function POST(request: Request) {
  const guard = await requirePermission("surgery:manage");
  if (guard.error) return guard.error;

  const body = await request.json();
  const patientId = str(body?.patientId);
  const procedure = str(body?.procedure);
  const surgeon = str(body?.surgeon);
  const theatre = str(body?.theatre);
  const scheduledAt = str(body?.scheduledAt);
  if (!patientId || !procedure || !surgeon || !theatre || !scheduledAt) {
    return NextResponse.json(
      { error: "patientId, procedure, surgeon, theatre and scheduledAt are required" },
      { status: 400 },
    );
  }
  if (Number.isNaN(Date.parse(scheduledAt))) {
    return NextResponse.json({ error: "scheduledAt must be a valid date-time" }, { status: 400 });
  }

  const booking = await createBooking(guard.session.company.id, {
    patientId, procedure, surgeon, theatre, scheduledAt, notes: str(body?.notes),
    createdBy: guard.session.user.id,
  });
  return NextResponse.json(booking, { status: 201 });
}

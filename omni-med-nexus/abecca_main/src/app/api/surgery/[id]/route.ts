import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { SURGERY_STATUSES, setBookingStatus, type SurgeryStatus } from "@/server/surgery/schedule";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("surgery:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;

  const body = await request.json();
  const status = body?.status as SurgeryStatus;
  if (!SURGERY_STATUSES.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const booking = await setBookingStatus(guard.session.company.id, id, status);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  return NextResponse.json(booking);
}

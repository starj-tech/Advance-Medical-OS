import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { listAntrol } from "@/server/bpjs/antrol";

export const dynamic = "force-dynamic";

/** All BPJS Antrol bookings for the tenant (the board maps them by ticketId). */
export async function GET() {
  const guard = await requirePermission("registration:read");
  if (guard.error) return guard.error;
  return NextResponse.json(await listAntrol(guard.session.company.id));
}

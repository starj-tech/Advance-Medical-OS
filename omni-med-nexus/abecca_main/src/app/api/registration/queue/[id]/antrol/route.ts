import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getTicket } from "@/server/registration/queue";
import { pushAntrean } from "@/server/bpjs/client";
import { getAntrolForTicket, saveAntrol } from "@/server/bpjs/antrol";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("registration:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  return NextResponse.json({ booking: (await getAntrolForTicket(guard.session.company.id, id)) ?? null });
}

/** Register this queue ticket to BPJS Antrean Online (mock when creds unset). */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("registration:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;

  const ticket = await getTicket(companyId, id);
  if (!ticket) return NextResponse.json({ error: "Tiket antrian tidak ditemukan" }, { status: 404 });

  const existing = await getAntrolForTicket(companyId, id);
  if (existing) return NextResponse.json(existing);

  const body = await request.json();
  const noKartu = typeof body?.noKartu === "string" ? body.noKartu.replace(/\s/g, "") : "";
  if (!/^\d{10,16}$/.test(noKartu)) {
    return NextResponse.json({ error: "noKartu (10–16 digit) wajib diisi" }, { status: 400 });
  }

  const result = await pushAntrean({
    noKartu,
    kodePoli: ticket.polyclinic,
    tanggalPeriksa: ticket.queueDate,
    noAntrean: ticket.queueNumber,
  });
  const booking = await saveAntrol(companyId, id, ticket.patientId, {
    noKartu,
    kodeBooking: result.kodeBooking,
    poli: ticket.polyclinic,
    isMock: result.mock,
    createdBy: guard.session.user.id,
  });
  return NextResponse.json(booking, { status: 201 });
}

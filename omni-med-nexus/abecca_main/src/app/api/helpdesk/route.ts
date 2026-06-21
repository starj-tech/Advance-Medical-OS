import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createTicket, listTickets, ticketSummary } from "@/server/it/helpdesk";
import { isTicketCategory, isTicketPriority } from "@/lib/helpdesk";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET() {
  const guard = await requirePermission("device:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const [tickets, summary] = await Promise.all([listTickets(companyId), ticketSummary(companyId, new Date())]);
  return NextResponse.json({ tickets, summary });
}

export async function POST(request: Request) {
  const guard = await requirePermission("device:write");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const reporter = str(body?.reporter);
  const subject = str(body?.subject);
  if (!reporter || !subject) {
    return NextResponse.json({ error: "Pelapor dan ringkasan masalah wajib diisi" }, { status: 400 });
  }
  if (!isTicketCategory(body?.category)) return NextResponse.json({ error: "Kategori tidak valid" }, { status: 400 });
  if (!isTicketPriority(body?.priority)) return NextResponse.json({ error: "Prioritas tidak valid" }, { status: 400 });
  const t = await createTicket(guard.session.company.id, {
    reporter, category: body.category, priority: body.priority,
    subject, description: str(body?.description) || null,
  });
  return NextResponse.json(t, { status: 201 });
}

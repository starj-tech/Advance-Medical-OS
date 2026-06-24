/**
 * IT helpdesk / service-desk register (Domain K). Tracks support tickets through their
 * lifecycle; the first move off "open" stamps firstResponseAt, which freezes the response
 * SLA outcome (lib/helpdesk). The summary rolls up status counts + how many still-open
 * tickets are past their first-response target. Tenant-scoped; env-gated.
 */
import { getSupabase } from "../supabase";
import {
  responseSla,
  type TicketPriority, type TicketCategory, type TicketStatus,
} from "@/lib/helpdesk";

export interface Ticket {
  id: string;
  companyId: string;
  reporter: string;
  category: TicketCategory;
  priority: TicketPriority;
  subject: string;
  description: string | null;
  status: TicketStatus;
  assignedTo: string | null;
  resolution: string | null;
  firstResponseAt: string | null;
  createdAt: string;
}

type Row = {
  id: string; company_id: string; reporter: string; category: string; priority: string;
  subject: string; description: string | null; status: string; assigned_to: string | null;
  resolution: string | null; first_response_at: string | null; created_at: string;
};
const toTicket = (r: Row): Ticket => ({
  id: r.id, companyId: r.company_id, reporter: r.reporter, category: r.category as TicketCategory,
  priority: r.priority as TicketPriority, subject: r.subject, description: r.description,
  status: r.status as TicketStatus, assignedTo: r.assigned_to, resolution: r.resolution,
  firstResponseAt: r.first_response_at, createdAt: r.created_at,
});

const g = globalThis as unknown as { __abeccaTickets?: Ticket[] };
const mem = g.__abeccaTickets ?? (g.__abeccaTickets = []);

/** Any status past "open" counts as the first response. */
const isResponded = (s: TicketStatus): boolean => s !== "open";

export async function createTicket(
  companyId: string,
  input: { reporter: string; category: TicketCategory; priority: TicketPriority; subject: string; description?: string | null; createdAt?: string | null },
): Promise<Ticket> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("helpdesk_tickets")
      .insert({ company_id: companyId, reporter: input.reporter, category: input.category, priority: input.priority, subject: input.subject, description: input.description ?? null, status: "open", ...(input.createdAt ? { created_at: input.createdAt } : {}) })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "create ticket failed");
    return toTicket(data as Row);
  }
  const t: Ticket = {
    id: crypto.randomUUID(), companyId, reporter: input.reporter, category: input.category,
    priority: input.priority, subject: input.subject, description: input.description ?? null,
    status: "open", assignedTo: null, resolution: null, firstResponseAt: null,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  mem.push(t);
  return t;
}

export async function listTickets(
  companyId: string,
  opts: { status?: TicketStatus; priority?: TicketPriority; category?: TicketCategory } = {},
): Promise<Ticket[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("helpdesk_tickets").select("*").eq("company_id", companyId);
    if (opts.status) q = q.eq("status", opts.status);
    if (opts.priority) q = q.eq("priority", opts.priority);
    if (opts.category) q = q.eq("category", opts.category);
    const { data } = await q.order("created_at", { ascending: false });
    return (data ?? []).map((r) => toTicket(r as Row));
  }
  return mem
    .filter((t) => t.companyId === companyId
      && (!opts.status || t.status === opts.status)
      && (!opts.priority || t.priority === opts.priority)
      && (!opts.category || t.category === opts.category))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateTicket(
  companyId: string,
  id: string,
  patch: { status?: TicketStatus; assignedTo?: string | null; resolution?: string | null },
): Promise<Ticket | undefined> {
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { data: existing } = await sb.from("helpdesk_tickets").select("*").eq("company_id", companyId).eq("id", id).maybeSingle();
    if (!existing) return undefined;
    const cur = toTicket(existing as Row);
    const fields: Record<string, unknown> = {};
    if (patch.assignedTo !== undefined) fields.assigned_to = patch.assignedTo;
    if (patch.resolution !== undefined) fields.resolution = patch.resolution;
    if (patch.status !== undefined) {
      fields.status = patch.status;
      // Stamp the first response the first time the ticket leaves "open".
      if (isResponded(patch.status) && !cur.firstResponseAt) fields.first_response_at = now;
    }
    const { data } = await sb.from("helpdesk_tickets").update(fields).eq("company_id", companyId).eq("id", id).select("*").maybeSingle();
    return data ? toTicket(data as Row) : undefined;
  }
  const t = mem.find((x) => x.companyId === companyId && x.id === id);
  if (!t) return undefined;
  if (patch.assignedTo !== undefined) t.assignedTo = patch.assignedTo;
  if (patch.resolution !== undefined) t.resolution = patch.resolution;
  if (patch.status !== undefined) {
    t.status = patch.status;
    if (isResponded(patch.status) && !t.firstResponseAt) t.firstResponseAt = now;
  }
  return t;
}

export interface TicketSummary {
  total: number;
  byStatus: Record<TicketStatus, number>;
  /** Still-open tickets already past their first-response target. */
  overdue: number;
}

export async function ticketSummary(companyId: string, now: Date): Promise<TicketSummary> {
  const all = await listTickets(companyId);
  const byStatus: Record<TicketStatus, number> = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
  let overdue = 0;
  for (const t of all) {
    byStatus[t.status] += 1;
    if (t.status === "open" && responseSla(t.priority, t.createdAt, null, now) === "overdue") overdue += 1;
  }
  return { total: all.length, byStatus, overdue };
}

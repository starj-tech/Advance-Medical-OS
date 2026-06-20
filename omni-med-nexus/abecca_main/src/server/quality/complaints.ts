/**
 * Patient complaint / grievance register (KARS-PMKP). Tracks a complaint through its
 * lifecycle; reaching resolved/closed stamps resolvedAt, which freezes the SLA outcome
 * (lib/complaints). The summary rolls up status counts + how many open complaints are
 * past their SLA target. Tenant-scoped; env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";
import {
  slaState,
  type ComplaintCategory, type ComplaintSeverity, type ComplaintStatus,
} from "@/lib/complaints";

export interface Complaint {
  id: string;
  companyId: string;
  patientId: string | null;
  reporter: string;
  category: ComplaintCategory;
  severity: ComplaintSeverity;
  subject: string;
  description: string | null;
  status: ComplaintStatus;
  assignedTo: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

type Row = {
  id: string; company_id: string; patient_id: string | null; reporter: string; category: string;
  severity: string; subject: string; description: string | null; status: string;
  assigned_to: string | null; resolution: string | null; resolved_at: string | null; created_at: string;
};
const toComplaint = (r: Row): Complaint => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, reporter: r.reporter,
  category: r.category as ComplaintCategory, severity: r.severity as ComplaintSeverity, subject: r.subject,
  description: r.description, status: r.status as ComplaintStatus, assignedTo: r.assigned_to,
  resolution: r.resolution, resolvedAt: r.resolved_at, createdAt: r.created_at,
});

const g = globalThis as unknown as { __abeccaComplaints?: Complaint[] };
const complaints = g.__abeccaComplaints ?? (g.__abeccaComplaints = []);

const isClosing = (s: ComplaintStatus): boolean => s === "resolved" || s === "closed";

export async function createComplaint(
  companyId: string,
  input: { patientId?: string | null; reporter: string; category: ComplaintCategory; severity: ComplaintSeverity; subject: string; description?: string | null; createdBy?: string | null; createdAt?: string | null },
): Promise<Complaint> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("complaints")
      .insert({ company_id: companyId, patient_id: input.patientId ?? null, reporter: input.reporter, category: input.category, severity: input.severity, subject: input.subject, description: input.description ?? null, status: "open", created_by: input.createdBy ?? null, ...(input.createdAt ? { created_at: input.createdAt } : {}) })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "create complaint failed");
    return toComplaint(data as Row);
  }
  const c: Complaint = {
    id: crypto.randomUUID(), companyId, patientId: input.patientId ?? null, reporter: input.reporter,
    category: input.category, severity: input.severity, subject: input.subject, description: input.description ?? null,
    status: "open", assignedTo: null, resolution: null, resolvedAt: null, createdAt: input.createdAt ?? new Date().toISOString(),
  };
  complaints.push(c);
  return c;
}

export async function listComplaints(companyId: string, opts: { status?: ComplaintStatus } = {}): Promise<Complaint[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("complaints").select("*").eq("company_id", companyId);
    if (opts.status) q = q.eq("status", opts.status);
    const { data } = await q.order("created_at", { ascending: false });
    return (data ?? []).map((r) => toComplaint(r as Row));
  }
  return complaints
    .filter((c) => c.companyId === companyId && (!opts.status || c.status === opts.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateComplaint(
  companyId: string,
  id: string,
  patch: { status?: ComplaintStatus; assignedTo?: string | null; resolution?: string | null },
): Promise<Complaint | undefined> {
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { data: existing } = await sb.from("complaints").select("*").eq("company_id", companyId).eq("id", id).maybeSingle();
    if (!existing) return undefined;
    const cur = toComplaint(existing as Row);
    const fields: Record<string, unknown> = {};
    if (patch.assignedTo !== undefined) fields.assigned_to = patch.assignedTo;
    if (patch.resolution !== undefined) fields.resolution = patch.resolution;
    if (patch.status !== undefined) {
      fields.status = patch.status;
      // Stamp resolvedAt the first time it closes; clear if reopened.
      if (isClosing(patch.status)) fields.resolved_at = cur.resolvedAt ?? now;
      else fields.resolved_at = null;
    }
    const { data } = await sb.from("complaints").update(fields).eq("company_id", companyId).eq("id", id).select("*").maybeSingle();
    return data ? toComplaint(data as Row) : undefined;
  }
  const c = complaints.find((x) => x.companyId === companyId && x.id === id);
  if (!c) return undefined;
  if (patch.assignedTo !== undefined) c.assignedTo = patch.assignedTo;
  if (patch.resolution !== undefined) c.resolution = patch.resolution;
  if (patch.status !== undefined) {
    c.status = patch.status;
    c.resolvedAt = isClosing(patch.status) ? (c.resolvedAt ?? now) : null;
  }
  return c;
}

export interface ComplaintSummary {
  total: number;
  byStatus: Record<ComplaintStatus, number>;
  /** Open (not yet resolved/closed) complaints already past their SLA target. */
  overdue: number;
}

export async function complaintSummary(companyId: string, now: Date): Promise<ComplaintSummary> {
  const all = await listComplaints(companyId);
  const byStatus: Record<ComplaintStatus, number> = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
  let overdue = 0;
  for (const c of all) {
    byStatus[c.status] += 1;
    if (!isClosing(c.status) && slaState(c.severity, c.createdAt, null, now) === "overdue") overdue += 1;
  }
  return { total: all.length, byStatus, overdue };
}

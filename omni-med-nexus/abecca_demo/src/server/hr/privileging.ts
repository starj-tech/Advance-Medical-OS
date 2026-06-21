/**
 * Clinical privileging registry (Rincian Kewenangan Klinis — KARS/KPS). Tenant-scoped
 * grants of specific clinical procedures to staff, each moving requested → granted →
 * suspended, with an optional review date after which a granted privilege lapses
 * (derived in lib/privileging). Pairs with the credential registry & staff directory.
 * Env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";
import {
  effectivePrivilegeStatus,
  type PrivilegeStatus, type PrivilegeCategory,
} from "@/lib/privileging";

export interface Privilege {
  id: string;
  companyId: string;
  staffName: string;
  category: PrivilegeCategory;
  privilege: string;
  status: PrivilegeStatus;
  reviewBy: string | null;
  notes: string | null;
  createdAt: string;
}

type Row = {
  id: string; company_id: string; staff_name: string; category: string; privilege: string;
  status: string; review_by: string | null; notes: string | null; created_at: string;
};
const toPrivilege = (r: Row): Privilege => ({
  id: r.id, companyId: r.company_id, staffName: r.staff_name, category: r.category as PrivilegeCategory,
  privilege: r.privilege, status: r.status as PrivilegeStatus, reviewBy: r.review_by,
  notes: r.notes, createdAt: r.created_at,
});

const g = globalThis as unknown as { __abeccaPrivileges?: Privilege[] };
const mem = g.__abeccaPrivileges ?? (g.__abeccaPrivileges = []);

export async function createPrivilege(
  companyId: string,
  input: { staffName: string; category: PrivilegeCategory; privilege: string; status?: PrivilegeStatus; reviewBy?: string | null; notes?: string | null },
): Promise<Privilege> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("clinical_privileges")
      .insert({ company_id: companyId, staff_name: input.staffName, category: input.category, privilege: input.privilege, status: input.status ?? "requested", review_by: input.reviewBy ?? null, notes: input.notes ?? null })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "create privilege failed");
    return toPrivilege(data as Row);
  }
  const p: Privilege = {
    id: crypto.randomUUID(), companyId, staffName: input.staffName, category: input.category,
    privilege: input.privilege, status: input.status ?? "requested", reviewBy: input.reviewBy ?? null,
    notes: input.notes ?? null, createdAt: new Date().toISOString(),
  };
  mem.push(p);
  return p;
}

export async function listPrivileges(
  companyId: string,
  opts: { status?: PrivilegeStatus; category?: PrivilegeCategory } = {},
): Promise<Privilege[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("clinical_privileges").select("*").eq("company_id", companyId);
    if (opts.status) q = q.eq("status", opts.status);
    if (opts.category) q = q.eq("category", opts.category);
    const { data } = await q.order("staff_name");
    return (data ?? []).map((r) => toPrivilege(r as Row));
  }
  return mem
    .filter((p) => p.companyId === companyId
      && (!opts.status || p.status === opts.status)
      && (!opts.category || p.category === opts.category))
    .sort((a, b) => a.staffName.localeCompare(b.staffName) || a.privilege.localeCompare(b.privilege));
}

export async function updatePrivilege(
  companyId: string,
  id: string,
  patch: { status?: PrivilegeStatus; reviewBy?: string | null; notes?: string | null },
): Promise<Privilege | undefined> {
  const sb = getSupabase();
  if (sb) {
    const fields: Record<string, unknown> = {};
    if (patch.status !== undefined) fields.status = patch.status;
    if (patch.reviewBy !== undefined) fields.review_by = patch.reviewBy;
    if (patch.notes !== undefined) fields.notes = patch.notes;
    const { data } = await sb.from("clinical_privileges").update(fields).eq("company_id", companyId).eq("id", id).select("*").maybeSingle();
    return data ? toPrivilege(data as Row) : undefined;
  }
  const p = mem.find((x) => x.companyId === companyId && x.id === id);
  if (!p) return undefined;
  if (patch.status !== undefined) p.status = patch.status;
  if (patch.reviewBy !== undefined) p.reviewBy = patch.reviewBy;
  if (patch.notes !== undefined) p.notes = patch.notes;
  return p;
}

export interface PrivilegeSummary {
  total: number;
  /** Counts keyed by *effective* status (granted lapses to expired past its review date). */
  byStatus: Record<PrivilegeStatus, number>;
}

export async function privilegeSummary(companyId: string, now: Date): Promise<PrivilegeSummary> {
  const all = await listPrivileges(companyId);
  const byStatus: Record<PrivilegeStatus, number> = { requested: 0, granted: 0, suspended: 0, expired: 0 };
  for (const p of all) byStatus[effectivePrivilegeStatus(p.status, p.reviewBy, now)] += 1;
  return { total: all.length, byStatus };
}

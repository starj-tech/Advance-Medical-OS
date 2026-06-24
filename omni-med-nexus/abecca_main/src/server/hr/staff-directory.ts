/**
 * Staff directory (Domain J). A tenant-scoped roster of all hospital personnel — distinct
 * from the `users` login table — with profession, unit, contact, and employment status.
 * Pairs with the credential registry (who is licensed) by answering "who works here".
 * Env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";
import { staffMatchesQuery, type StaffStatus, type StaffProfession } from "@/lib/staff-directory";

export interface StaffMember {
  id: string;
  companyId: string;
  name: string;
  profession: StaffProfession;
  unit: string | null;
  phone: string | null;
  email: string | null;
  status: StaffStatus;
  createdAt: string;
}

type Row = {
  id: string; company_id: string; name: string; profession: string; unit: string | null;
  phone: string | null; email: string | null; status: string; created_at: string;
};
const toStaff = (r: Row): StaffMember => ({
  id: r.id, companyId: r.company_id, name: r.name, profession: r.profession as StaffProfession,
  unit: r.unit, phone: r.phone, email: r.email, status: r.status as StaffStatus, createdAt: r.created_at,
});

const g = globalThis as unknown as { __abeccaStaff?: StaffMember[] };
const mem = g.__abeccaStaff ?? (g.__abeccaStaff = []);

export async function createStaff(
  companyId: string,
  input: { name: string; profession: StaffProfession; unit?: string | null; phone?: string | null; email?: string | null; status?: StaffStatus },
): Promise<StaffMember> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("staff_directory")
      .insert({ company_id: companyId, name: input.name, profession: input.profession, unit: input.unit ?? null, phone: input.phone ?? null, email: input.email ?? null, status: input.status ?? "active" })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "create staff failed");
    return toStaff(data as Row);
  }
  const s: StaffMember = {
    id: crypto.randomUUID(), companyId, name: input.name, profession: input.profession,
    unit: input.unit ?? null, phone: input.phone ?? null, email: input.email ?? null,
    status: input.status ?? "active", createdAt: new Date().toISOString(),
  };
  mem.push(s);
  return s;
}

export async function listStaff(
  companyId: string,
  opts: { status?: StaffStatus; profession?: StaffProfession; query?: string } = {},
): Promise<StaffMember[]> {
  const sb = getSupabase();
  let rows: StaffMember[];
  if (sb) {
    let q = sb.from("staff_directory").select("*").eq("company_id", companyId);
    if (opts.status) q = q.eq("status", opts.status);
    if (opts.profession) q = q.eq("profession", opts.profession);
    const { data } = await q.order("name");
    rows = (data ?? []).map((r) => toStaff(r as Row));
  } else {
    rows = mem
      .filter((s) => s.companyId === companyId
        && (!opts.status || s.status === opts.status)
        && (!opts.profession || s.profession === opts.profession))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  // The free-text query is applied in app code so Supabase and in-memory match exactly.
  if (opts.query) rows = rows.filter((s) => staffMatchesQuery(opts.query!, [s.name, s.unit, s.email, s.phone]));
  return rows;
}

export async function updateStaff(
  companyId: string,
  id: string,
  patch: { status?: StaffStatus; unit?: string | null; phone?: string | null; email?: string | null },
): Promise<StaffMember | undefined> {
  const sb = getSupabase();
  if (sb) {
    const fields: Record<string, unknown> = {};
    if (patch.status !== undefined) fields.status = patch.status;
    if (patch.unit !== undefined) fields.unit = patch.unit;
    if (patch.phone !== undefined) fields.phone = patch.phone;
    if (patch.email !== undefined) fields.email = patch.email;
    const { data } = await sb.from("staff_directory").update(fields).eq("company_id", companyId).eq("id", id).select("*").maybeSingle();
    return data ? toStaff(data as Row) : undefined;
  }
  const s = mem.find((x) => x.companyId === companyId && x.id === id);
  if (!s) return undefined;
  if (patch.status !== undefined) s.status = patch.status;
  if (patch.unit !== undefined) s.unit = patch.unit;
  if (patch.phone !== undefined) s.phone = patch.phone;
  if (patch.email !== undefined) s.email = patch.email;
  return s;
}

export interface StaffSummary {
  total: number;
  byStatus: Record<StaffStatus, number>;
}

export async function staffSummary(companyId: string): Promise<StaffSummary> {
  const all = await listStaff(companyId);
  const byStatus: Record<StaffStatus, number> = { active: 0, on_leave: 0, inactive: 0 };
  for (const s of all) byStatus[s.status] += 1;
  return { total: all.length, byStatus };
}

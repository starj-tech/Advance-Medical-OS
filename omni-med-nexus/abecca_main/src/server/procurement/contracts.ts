/**
 * Vendor contract register (Domain K — procurement/legal). Tenant-scoped contracts with a
 * value, period, and admin status; while active, the renewal/expiry state is derived from
 * the end date (lib/contracts) so the board surfaces lapses before they happen. The summary
 * rolls up status + expiry counts and the total value of active contracts. Env-gated.
 */
import { getSupabase } from "../supabase";
import { contractExpiry, type ContractStatus, type ContractType, type ContractExpiry } from "@/lib/contracts";

export interface Contract {
  id: string;
  companyId: string;
  vendor: string;
  title: string;
  type: ContractType;
  value: number;
  startDate: string | null;
  endDate: string | null;
  status: ContractStatus;
  notes: string | null;
  createdAt: string;
}

type Row = {
  id: string; company_id: string; vendor: string; title: string; type: string; value: number;
  start_date: string | null; end_date: string | null; status: string; notes: string | null; created_at: string;
};
const toContract = (r: Row): Contract => ({
  id: r.id, companyId: r.company_id, vendor: r.vendor, title: r.title, type: r.type as ContractType,
  value: Number(r.value), startDate: r.start_date, endDate: r.end_date, status: r.status as ContractStatus,
  notes: r.notes, createdAt: r.created_at,
});

const g = globalThis as unknown as { __abeccaContracts?: Contract[] };
const mem = g.__abeccaContracts ?? (g.__abeccaContracts = []);

export async function createContract(
  companyId: string,
  input: { vendor: string; title: string; type: ContractType; value?: number; startDate?: string | null; endDate?: string | null; status?: ContractStatus; notes?: string | null },
): Promise<Contract> {
  const value = Math.max(0, Math.round(input.value ?? 0));
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("vendor_contracts")
      .insert({ company_id: companyId, vendor: input.vendor, title: input.title, type: input.type, value, start_date: input.startDate ?? null, end_date: input.endDate ?? null, status: input.status ?? "active", notes: input.notes ?? null })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "create contract failed");
    return toContract(data as Row);
  }
  const c: Contract = {
    id: crypto.randomUUID(), companyId, vendor: input.vendor, title: input.title, type: input.type,
    value, startDate: input.startDate ?? null, endDate: input.endDate ?? null, status: input.status ?? "active",
    notes: input.notes ?? null, createdAt: new Date().toISOString(),
  };
  mem.push(c);
  return c;
}

export async function listContracts(
  companyId: string,
  opts: { status?: ContractStatus; type?: ContractType } = {},
): Promise<Contract[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("vendor_contracts").select("*").eq("company_id", companyId);
    if (opts.status) q = q.eq("status", opts.status);
    if (opts.type) q = q.eq("type", opts.type);
    const { data } = await q.order("end_date", { nullsFirst: false });
    return (data ?? []).map((r) => toContract(r as Row));
  }
  return mem
    .filter((c) => c.companyId === companyId
      && (!opts.status || c.status === opts.status)
      && (!opts.type || c.type === opts.type))
    // Soonest to end first; open-ended (null) last.
    .sort((a, b) => (a.endDate ?? "9999").localeCompare(b.endDate ?? "9999") || a.vendor.localeCompare(b.vendor));
}

export async function updateContract(
  companyId: string,
  id: string,
  patch: { status?: ContractStatus; value?: number; startDate?: string | null; endDate?: string | null; notes?: string | null },
): Promise<Contract | undefined> {
  const sb = getSupabase();
  if (sb) {
    const fields: Record<string, unknown> = {};
    if (patch.status !== undefined) fields.status = patch.status;
    if (patch.value !== undefined) fields.value = Math.max(0, Math.round(patch.value));
    if (patch.startDate !== undefined) fields.start_date = patch.startDate;
    if (patch.endDate !== undefined) fields.end_date = patch.endDate;
    if (patch.notes !== undefined) fields.notes = patch.notes;
    const { data } = await sb.from("vendor_contracts").update(fields).eq("company_id", companyId).eq("id", id).select("*").maybeSingle();
    return data ? toContract(data as Row) : undefined;
  }
  const c = mem.find((x) => x.companyId === companyId && x.id === id);
  if (!c) return undefined;
  if (patch.status !== undefined) c.status = patch.status;
  if (patch.value !== undefined) c.value = Math.max(0, Math.round(patch.value));
  if (patch.startDate !== undefined) c.startDate = patch.startDate;
  if (patch.endDate !== undefined) c.endDate = patch.endDate;
  if (patch.notes !== undefined) c.notes = patch.notes;
  return c;
}

export interface ContractSummary {
  total: number;
  byStatus: Record<ContractStatus, number>;
  /** Renewal/expiry counts for ACTIVE contracts only. */
  expiry: Record<ContractExpiry, number>;
  /** Total value (IDR) of active contracts. */
  activeValue: number;
}

export async function contractSummary(companyId: string, now: Date): Promise<ContractSummary> {
  const all = await listContracts(companyId);
  const byStatus: Record<ContractStatus, number> = { active: 0, terminated: 0 };
  const expiry: Record<ContractExpiry, number> = { ok: 0, expiring_soon: 0, expired: 0 };
  let activeValue = 0;
  for (const c of all) {
    byStatus[c.status] += 1;
    if (c.status === "active") {
      activeValue += c.value;
      const e = contractExpiry(c.endDate, now);
      if (e) expiry[e] += 1;
    }
  }
  return { total: all.length, byStatus, expiry, activeValue };
}

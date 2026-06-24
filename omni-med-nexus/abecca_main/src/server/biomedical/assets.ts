/**
 * Biomedical asset register (IPSRS — KARS/MFK). Tenant-scoped medical-equipment inventory
 * with operational status and a calibration/maintenance schedule; the calibration state is
 * derived from the next-due date at read time (lib/biomedical) so the compliance board never
 * shows a stale "ok". Env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";
import { calibrationState, type AssetStatus, type AssetCategory, type CalibrationState } from "@/lib/biomedical";

export interface BiomedicalAsset {
  id: string;
  companyId: string;
  name: string;
  category: AssetCategory;
  location: string;
  serialNo: string | null;
  status: AssetStatus;
  lastMaintenance: string | null;
  nextDue: string | null;
  notes: string | null;
  createdAt: string;
}

type Row = {
  id: string; company_id: string; name: string; category: string; location: string;
  serial_no: string | null; status: string; last_maintenance: string | null;
  next_due: string | null; notes: string | null; created_at: string;
};
const toAsset = (r: Row): BiomedicalAsset => ({
  id: r.id, companyId: r.company_id, name: r.name, category: r.category as AssetCategory,
  location: r.location, serialNo: r.serial_no, status: r.status as AssetStatus,
  lastMaintenance: r.last_maintenance, nextDue: r.next_due, notes: r.notes, createdAt: r.created_at,
});

const g = globalThis as unknown as { __abeccaAssets?: BiomedicalAsset[] };
const mem = g.__abeccaAssets ?? (g.__abeccaAssets = []);

export async function createAsset(
  companyId: string,
  input: { name: string; category: AssetCategory; location: string; serialNo?: string | null; status?: AssetStatus; lastMaintenance?: string | null; nextDue?: string | null; notes?: string | null },
): Promise<BiomedicalAsset> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("biomedical_assets")
      .insert({ company_id: companyId, name: input.name, category: input.category, location: input.location, serial_no: input.serialNo ?? null, status: input.status ?? "operational", last_maintenance: input.lastMaintenance ?? null, next_due: input.nextDue ?? null, notes: input.notes ?? null })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "create asset failed");
    return toAsset(data as Row);
  }
  const a: BiomedicalAsset = {
    id: crypto.randomUUID(), companyId, name: input.name, category: input.category, location: input.location,
    serialNo: input.serialNo ?? null, status: input.status ?? "operational", lastMaintenance: input.lastMaintenance ?? null,
    nextDue: input.nextDue ?? null, notes: input.notes ?? null, createdAt: new Date().toISOString(),
  };
  mem.push(a);
  return a;
}

export async function listAssets(
  companyId: string,
  opts: { status?: AssetStatus; category?: AssetCategory } = {},
): Promise<BiomedicalAsset[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("biomedical_assets").select("*").eq("company_id", companyId);
    if (opts.status) q = q.eq("status", opts.status);
    if (opts.category) q = q.eq("category", opts.category);
    const { data } = await q.order("next_due", { nullsFirst: false });
    return (data ?? []).map((r) => toAsset(r as Row));
  }
  return mem
    .filter((a) => a.companyId === companyId
      && (!opts.status || a.status === opts.status)
      && (!opts.category || a.category === opts.category))
    // Soonest due first; unscheduled (null) last.
    .sort((a, b) => (a.nextDue ?? "9999").localeCompare(b.nextDue ?? "9999") || a.name.localeCompare(b.name));
}

export async function updateAsset(
  companyId: string,
  id: string,
  patch: { status?: AssetStatus; location?: string; lastMaintenance?: string | null; nextDue?: string | null; notes?: string | null },
): Promise<BiomedicalAsset | undefined> {
  const sb = getSupabase();
  if (sb) {
    const fields: Record<string, unknown> = {};
    if (patch.status !== undefined) fields.status = patch.status;
    if (patch.location !== undefined) fields.location = patch.location;
    if (patch.lastMaintenance !== undefined) fields.last_maintenance = patch.lastMaintenance;
    if (patch.nextDue !== undefined) fields.next_due = patch.nextDue;
    if (patch.notes !== undefined) fields.notes = patch.notes;
    const { data } = await sb.from("biomedical_assets").update(fields).eq("company_id", companyId).eq("id", id).select("*").maybeSingle();
    return data ? toAsset(data as Row) : undefined;
  }
  const a = mem.find((x) => x.companyId === companyId && x.id === id);
  if (!a) return undefined;
  if (patch.status !== undefined) a.status = patch.status;
  if (patch.location !== undefined) a.location = patch.location;
  if (patch.lastMaintenance !== undefined) a.lastMaintenance = patch.lastMaintenance;
  if (patch.nextDue !== undefined) a.nextDue = patch.nextDue;
  if (patch.notes !== undefined) a.notes = patch.notes;
  return a;
}

export interface AssetSummary {
  total: number;
  byStatus: Record<AssetStatus, number>;
  /** Calibration compliance counts (scheduled assets only). */
  calibration: Record<CalibrationState, number>;
}

export async function assetSummary(companyId: string, now: Date): Promise<AssetSummary> {
  const all = await listAssets(companyId);
  const byStatus: Record<AssetStatus, number> = { operational: 0, maintenance: 0, broken: 0, retired: 0 };
  const calibration: Record<CalibrationState, number> = { ok: 0, due_soon: 0, overdue: 0 };
  for (const a of all) {
    byStatus[a.status] += 1;
    const cal = calibrationState(a.nextDue, now);
    if (cal) calibration[cal] += 1;
  }
  return { total: all.length, byStatus, calibration };
}

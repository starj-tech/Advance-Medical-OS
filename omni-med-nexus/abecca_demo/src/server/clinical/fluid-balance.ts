/**
 * Fluid balance / intake–output charting (Domain E). One row per measured volume in or out for
 * a patient; the running balance (intake − output) is derived from the entries via the pure
 * fluid-balance module. Tenant-scoped by company_id; env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";
import { isValidType, isValidVolume, totalIntake, totalOutput, netBalance, type FluidDirection } from "@/lib/fluid-balance";

export interface FluidEntry {
  id: string;
  companyId: string;
  patientId: string;
  patientName: string;
  direction: FluidDirection;
  type: string;
  volumeMl: number;
  note: string | null;
  recordedBy: string | null;
  recordedAt: string;
}

type Row = {
  id: string; company_id: string; patient_id: string; patient_name: string; direction: FluidDirection;
  type: string; volume_ml: number; note: string | null; recorded_by: string | null; recorded_at: string;
};
const toEntry = (r: Row): FluidEntry => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, patientName: r.patient_name,
  direction: r.direction, type: r.type, volumeMl: Number(r.volume_ml), note: r.note,
  recordedBy: r.recorded_by, recordedAt: r.recorded_at,
});

const g = globalThis as unknown as { __abeccaFluidEntries?: FluidEntry[] };
const mem = g.__abeccaFluidEntries ?? (g.__abeccaFluidEntries = []);

export type RecordResult =
  | { ok: true; entry: FluidEntry }
  | { ok: false; reason: "invalid_type" | "invalid_volume" };

/** Record one intake/output measurement. Validates the type↔direction pairing and the volume. */
export async function recordFluidEntry(
  companyId: string,
  input: { patientId: string; patientName: string; direction: FluidDirection; type: string; volumeMl: number; note?: string | null; recordedBy?: string | null; recordedAt?: string },
): Promise<RecordResult> {
  if (!isValidType(input.direction, input.type)) return { ok: false, reason: "invalid_type" };
  if (!isValidVolume(input.volumeMl)) return { ok: false, reason: "invalid_volume" };
  const note = input.note?.trim() || null;

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("fluid_balance_entries")
      .insert({
        company_id: companyId, patient_id: input.patientId, patient_name: input.patientName,
        direction: input.direction, type: input.type, volume_ml: input.volumeMl, note,
        recorded_by: input.recordedBy ?? null, ...(input.recordedAt ? { recorded_at: input.recordedAt } : {}),
      })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "record fluid entry failed");
    return { ok: true, entry: toEntry(data as Row) };
  }
  const entry: FluidEntry = {
    id: crypto.randomUUID(), companyId, patientId: input.patientId, patientName: input.patientName,
    direction: input.direction, type: input.type, volumeMl: input.volumeMl, note,
    recordedBy: input.recordedBy ?? null, recordedAt: input.recordedAt ?? new Date().toISOString(),
  };
  mem.push(entry);
  return { ok: true, entry };
}

export async function listFluidEntries(
  companyId: string,
  filter: { patientId?: string } = {},
): Promise<FluidEntry[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("fluid_balance_entries").select("*").eq("company_id", companyId);
    if (filter.patientId) q = q.eq("patient_id", filter.patientId);
    const { data } = await q.order("recorded_at", { ascending: false });
    return (data ?? []).map((r) => toEntry(r as Row));
  }
  return mem
    .filter((e) => e.companyId === companyId && (!filter.patientId || e.patientId === filter.patientId))
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export interface FluidSummary {
  intake: number;
  output: number;
  net: number;
  count: number;
}
/** Tally intake/output/net for a tenant (optionally one patient). */
export async function fluidSummary(companyId: string, filter: { patientId?: string } = {}): Promise<FluidSummary> {
  const entries = await listFluidEntries(companyId, filter);
  return {
    intake: totalIntake(entries),
    output: totalOutput(entries),
    net: netBalance(entries),
    count: entries.length,
  };
}

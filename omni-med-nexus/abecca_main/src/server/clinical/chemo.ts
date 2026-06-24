/**
 * Oncology chemotherapy courses. Tenant-scoped by company_id; env-gated
 * (Supabase or in-memory). A course pins a regimen from lib/chemo-regimens
 * (denormalised name/cycles/interval so later catalogue edits don't rewrite
 * history); recording a cycle advances the counter and computes the next due
 * date; reaching the planned total completes the course.
 */
import { getSupabase } from "../supabase";
import { findRegimen } from "@/lib/chemo-regimens";

export type ChemoCourseStatus = "active" | "completed" | "stopped";

export interface ChemoCourse {
  id: string;
  companyId: string;
  patientId: string;
  regimenCode: string;
  regimenName: string;
  indication: string;
  totalCycles: number;
  intervalDays: number;
  cyclesGiven: number;
  lastCycleAt: string | null;
  /** When the next cycle is due (null once completed/stopped). */
  nextDueAt: string | null;
  status: ChemoCourseStatus;
  startedBy: string | null;
  createdAt: string;
}

const g = globalThis as unknown as { __abeccaChemo?: ChemoCourse[] };
const mem = g.__abeccaChemo ?? (g.__abeccaChemo = []);

type Row = {
  id: string; company_id: string; patient_id: string; regimen_code: string;
  regimen_name: string; indication: string; total_cycles: number; interval_days: number;
  cycles_given: number; last_cycle_at: string | null; next_due_at: string | null;
  status: ChemoCourseStatus; started_by: string | null; created_at: string;
};
const toCourse = (r: Row): ChemoCourse => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, regimenCode: r.regimen_code,
  regimenName: r.regimen_name, indication: r.indication, totalCycles: r.total_cycles,
  intervalDays: r.interval_days, cyclesGiven: r.cycles_given, lastCycleAt: r.last_cycle_at,
  nextDueAt: r.next_due_at, status: r.status, startedBy: r.started_by, createdAt: r.created_at,
});

export async function createChemoCourse(
  companyId: string,
  input: { patientId: string; regimenCode: string; startedBy?: string | null },
): Promise<ChemoCourse | undefined> {
  const regimen = findRegimen(input.regimenCode);
  if (!regimen) return undefined;
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("chemo_courses")
      .insert({
        company_id: companyId,
        patient_id: input.patientId,
        regimen_code: regimen.code,
        regimen_name: regimen.name,
        indication: regimen.indication,
        total_cycles: regimen.cycles,
        interval_days: regimen.intervalDays,
        cycles_given: 0,
        next_due_at: now,
        status: "active",
        started_by: input.startedBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create chemo course failed");
    return toCourse(data as Row);
  }
  const course: ChemoCourse = {
    id: crypto.randomUUID(),
    companyId,
    patientId: input.patientId,
    regimenCode: regimen.code,
    regimenName: regimen.name,
    indication: regimen.indication,
    totalCycles: regimen.cycles,
    intervalDays: regimen.intervalDays,
    cyclesGiven: 0,
    lastCycleAt: null,
    nextDueAt: now,
    status: "active",
    startedBy: input.startedBy ?? null,
    createdAt: now,
  };
  mem.push(course);
  return course;
}

export async function listChemoCourses(companyId: string): Promise<ChemoCourse[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("chemo_courses")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => toCourse(r as Row));
  }
  return mem
    .filter((c) => c.companyId === companyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getChemoCourse(
  companyId: string,
  id: string,
): Promise<ChemoCourse | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("chemo_courses").select("*").eq("company_id", companyId).eq("id", id).maybeSingle();
    return data ? toCourse(data as Row) : undefined;
  }
  return mem.find((c) => c.companyId === companyId && c.id === id);
}

/** Record an administered cycle; completes the course at the planned total. */
export async function recordChemoCycle(
  companyId: string,
  id: string,
): Promise<ChemoCourse | undefined> {
  const existing = await getChemoCourse(companyId, id);
  if (!existing || existing.status !== "active") return undefined;
  const now = new Date();
  const cyclesGiven = existing.cyclesGiven + 1;
  const completed = cyclesGiven >= existing.totalCycles;
  const nextDueAt = completed
    ? null
    : new Date(now.getTime() + existing.intervalDays * 86_400_000).toISOString();
  const patch = {
    cyclesGiven,
    lastCycleAt: now.toISOString(),
    nextDueAt,
    status: (completed ? "completed" : "active") as ChemoCourseStatus,
  };
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("chemo_courses")
      .update({
        cycles_given: patch.cyclesGiven,
        last_cycle_at: patch.lastCycleAt,
        next_due_at: patch.nextDueAt,
        status: patch.status,
      })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toCourse(data as Row) : undefined;
  }
  Object.assign(existing, patch);
  return existing;
}

export async function stopChemoCourse(
  companyId: string,
  id: string,
): Promise<ChemoCourse | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("chemo_courses")
      .update({ status: "stopped", next_due_at: null })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toCourse(data as Row) : undefined;
  }
  const c = mem.find((x) => x.companyId === companyId && x.id === id);
  if (!c) return undefined;
  c.status = "stopped";
  c.nextDueAt = null;
  return c;
}

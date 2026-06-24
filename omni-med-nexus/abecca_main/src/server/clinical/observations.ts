/**
 * Bedside observations + EWS. One row per observation set against an encounter,
 * scored with the NEWS2 engine (lib/ews) at write time so the escalation band is
 * persisted alongside the raw vitals. Tenant-scoped by company_id; env-gated
 * (Supabase when configured, else in-memory) like the rest of the BFF.
 */
import { getSupabase } from "../supabase";
import { type Consciousness, type EwsBand, scoreNews2 } from "@/lib/ews";

export interface Observation {
  id: string;
  companyId: string;
  encounterId: string;
  patientId: string;
  respiratoryRate: number;
  spo2: number;
  onOxygen: boolean;
  temperature: number;
  systolicBp: number;
  pulse: number;
  consciousness: Consciousness;
  ewsScore: number;
  ewsBand: EwsBand;
  recordedBy: string | null;
  recordedAt: string;
}

export interface RecordObservationInput {
  encounterId: string;
  patientId: string;
  respiratoryRate: number;
  spo2: number;
  onOxygen: boolean;
  temperature: number;
  systolicBp: number;
  pulse: number;
  consciousness: Consciousness;
  recordedBy?: string | null;
}

const g = globalThis as unknown as { __abeccaObservations?: Observation[] };
const mem = g.__abeccaObservations ?? (g.__abeccaObservations = []);

type Row = {
  id: string; company_id: string; encounter_id: string; patient_id: string;
  respiratory_rate: number; spo2: number; on_oxygen: boolean; temperature: number;
  systolic_bp: number; pulse: number; consciousness: Consciousness;
  ews_score: number; ews_band: EwsBand; recorded_by: string | null; recorded_at: string;
};
const toObs = (r: Row): Observation => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  respiratoryRate: r.respiratory_rate, spo2: r.spo2, onOxygen: r.on_oxygen,
  temperature: r.temperature, systolicBp: r.systolic_bp, pulse: r.pulse,
  consciousness: r.consciousness, ewsScore: r.ews_score, ewsBand: r.ews_band,
  recordedBy: r.recorded_by, recordedAt: r.recorded_at,
});

export async function recordObservation(
  companyId: string,
  input: RecordObservationInput,
): Promise<Observation> {
  // Score at write time so the band is fixed to the vitals as recorded.
  const ews = scoreNews2({
    respiratoryRate: input.respiratoryRate,
    spo2: input.spo2,
    onOxygen: input.onOxygen,
    temperature: input.temperature,
    systolicBp: input.systolicBp,
    pulse: input.pulse,
    consciousness: input.consciousness,
  });

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("observations")
      .insert({
        company_id: companyId,
        encounter_id: input.encounterId,
        patient_id: input.patientId,
        respiratory_rate: input.respiratoryRate,
        spo2: input.spo2,
        on_oxygen: input.onOxygen,
        temperature: input.temperature,
        systolic_bp: input.systolicBp,
        pulse: input.pulse,
        consciousness: input.consciousness,
        ews_score: ews.score,
        ews_band: ews.band,
        recorded_by: input.recordedBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "record observation failed");
    return toObs(data as Row);
  }

  const obs: Observation = {
    id: crypto.randomUUID(),
    companyId,
    encounterId: input.encounterId,
    patientId: input.patientId,
    respiratoryRate: input.respiratoryRate,
    spo2: input.spo2,
    onOxygen: input.onOxygen,
    temperature: input.temperature,
    systolicBp: input.systolicBp,
    pulse: input.pulse,
    consciousness: input.consciousness,
    ewsScore: ews.score,
    ewsBand: ews.band,
    recordedBy: input.recordedBy ?? null,
    recordedAt: new Date().toISOString(),
  };
  mem.push(obs);
  return obs;
}

export async function listObservations(
  companyId: string,
  encounterId: string,
): Promise<Observation[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("observations")
      .select("*")
      .eq("company_id", companyId)
      .eq("encounter_id", encounterId)
      .order("recorded_at", { ascending: false });
    return (data ?? []).map((r) => toObs(r as Row));
  }
  return mem
    .filter((o) => o.companyId === companyId && o.encounterId === encounterId)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

/** Company-wide observations, newest first — feeds the risk register's acuity signal. */
export async function listAllObservations(companyId: string): Promise<Observation[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("observations")
      .select("*")
      .eq("company_id", companyId)
      .order("recorded_at", { ascending: false });
    return (data ?? []).map((r) => toObs(r as Row));
  }
  return mem
    .filter((o) => o.companyId === companyId)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

/**
 * Glasgow Coma Scale assessments (Domain A/E). One row per neuro assessment; the total and
 * severity band are computed server-side from the eye/verbal/motor components via the pure GCS
 * module, so a stored band always matches its inputs. Tenant-scoped by company_id; env-gated.
 */
import { getSupabase } from "../supabase";
import { coerceGcsInput, gcsScore, gcsSeverity, gcsNotation, type GcsInput } from "@/lib/gcs";

export interface GcsAssessment {
  id: string;
  companyId: string;
  patientId: string;
  patientName: string;
  eye: number;
  verbal: number;
  motor: number;
  score: number;
  severity: string;
  notation: string;
  note: string | null;
  assessedBy: string | null;
  assessedAt: string;
}

type Row = {
  id: string; company_id: string; patient_id: string; patient_name: string;
  eye: number; verbal: number; motor: number; score: number; severity: string;
  note: string | null; assessed_by: string | null; assessed_at: string;
};
const toAssessment = (r: Row): GcsAssessment => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, patientName: r.patient_name,
  eye: Number(r.eye), verbal: Number(r.verbal), motor: Number(r.motor), score: Number(r.score), severity: r.severity,
  notation: gcsNotation({ eye: r.eye, verbal: r.verbal, motor: r.motor } as GcsInput),
  note: r.note, assessedBy: r.assessed_by, assessedAt: r.assessed_at,
});

const g = globalThis as unknown as { __abeccaGcs?: GcsAssessment[] };
const mem = g.__abeccaGcs ?? (g.__abeccaGcs = []);

export type RecordResult =
  | { ok: true; assessment: GcsAssessment }
  | { ok: false; reason: "invalid_components" };

/** Record a GCS assessment. score/severity are derived from components; bad inputs are rejected. */
export async function recordGcs(
  companyId: string,
  input: { patientId: string; patientName: string; components: unknown; note?: string | null; assessedBy?: string | null },
): Promise<RecordResult> {
  const components = coerceGcsInput(input.components);
  if (!components) return { ok: false, reason: "invalid_components" };
  const score = gcsScore(components);
  const severity = gcsSeverity(score);
  const note = input.note?.trim() || null;

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("gcs_assessments")
      .insert({
        company_id: companyId, patient_id: input.patientId, patient_name: input.patientName,
        eye: components.eye, verbal: components.verbal, motor: components.motor,
        score, severity, note, assessed_by: input.assessedBy ?? null,
      })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "record gcs failed");
    return { ok: true, assessment: toAssessment(data as Row) };
  }
  const assessment: GcsAssessment = {
    id: crypto.randomUUID(), companyId, patientId: input.patientId, patientName: input.patientName,
    eye: components.eye, verbal: components.verbal, motor: components.motor, score, severity,
    notation: gcsNotation(components), note, assessedBy: input.assessedBy ?? null, assessedAt: new Date().toISOString(),
  };
  mem.push(assessment);
  return { ok: true, assessment };
}

export async function listGcs(companyId: string, filter: { patientId?: string } = {}): Promise<GcsAssessment[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("gcs_assessments").select("*").eq("company_id", companyId);
    if (filter.patientId) q = q.eq("patient_id", filter.patientId);
    const { data } = await q.order("assessed_at", { ascending: false });
    return (data ?? []).map((r) => toAssessment(r as Row));
  }
  return mem
    .filter((a) => a.companyId === companyId && (!filter.patientId || a.patientId === filter.patientId))
    .sort((a, b) => b.assessedAt.localeCompare(a.assessedAt));
}

export interface GcsSummary {
  total: number;
  severe: number;
}
export async function gcsSummary(companyId: string): Promise<GcsSummary> {
  const all = await listGcs(companyId);
  return { total: all.length, severe: all.filter((a) => a.severity === "severe").length };
}

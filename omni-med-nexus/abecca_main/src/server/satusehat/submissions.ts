/**
 * SATUSEHAT FHIR submission log per encounter. Tenant-scoped; env-gated.
 */
import { getSupabase } from "../supabase";

export interface Submission {
  id: string;
  companyId: string;
  encounterId: string;
  patientId: string;
  resourceType: string;
  fhirId: string | null;
  status: "sent" | "failed";
  isMock: boolean;
  error: string | null;
  createdBy: string | null;
  createdAt: string;
}

const g = globalThis as unknown as { __abeccaSatusehat?: Submission[] };
const mem = g.__abeccaSatusehat ?? (g.__abeccaSatusehat = []);

type Row = {
  id: string; company_id: string; encounter_id: string; patient_id: string;
  resource_type: string; fhir_id: string | null; status: "sent" | "failed";
  is_mock: boolean; error: string | null; created_by: string | null; created_at: string;
};
const toSub = (r: Row): Submission => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  resourceType: r.resource_type, fhirId: r.fhir_id, status: r.status, isMock: r.is_mock,
  error: r.error, createdBy: r.created_by, createdAt: r.created_at,
});

export interface SaveSubmissionInput {
  resourceType: string;
  fhirId: string | null;
  status: "sent" | "failed";
  isMock: boolean;
  error?: string | null;
  createdBy?: string | null;
}

export async function saveSubmission(
  companyId: string,
  encounterId: string,
  patientId: string,
  input: SaveSubmissionInput,
): Promise<Submission> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("satusehat_submissions")
      .insert({
        company_id: companyId, encounter_id: encounterId, patient_id: patientId,
        resource_type: input.resourceType, fhir_id: input.fhirId, status: input.status,
        is_mock: input.isMock, error: input.error ?? null, created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "save submission failed");
    return toSub(data as Row);
  }
  const sub: Submission = {
    id: crypto.randomUUID(), companyId, encounterId, patientId,
    resourceType: input.resourceType, fhirId: input.fhirId, status: input.status,
    isMock: input.isMock, error: input.error ?? null, createdBy: input.createdBy ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(sub);
  return sub;
}

export async function listSubmissions(companyId: string, encounterId: string): Promise<Submission[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("satusehat_submissions")
      .select("*")
      .eq("company_id", companyId)
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => toSub(r as Row));
  }
  return mem
    .filter((s) => s.companyId === companyId && s.encounterId === encounterId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

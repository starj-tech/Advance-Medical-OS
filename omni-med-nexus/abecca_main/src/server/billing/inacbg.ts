/**
 * INA-CBG claims per encounter. Grouping uses lib/inacbg (illustrative, not the
 * licensed Kemenkes grouper). Tenant-scoped; env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";
import {
  groupByDiagnosis,
  tariffForClass,
  type CareClass,
} from "@/lib/inacbg";

export type ClaimStatus = "draft" | "submitted" | "approved" | "rejected";

export interface InacbgClaim {
  id: string;
  companyId: string;
  encounterId: string;
  patientId: string;
  cbgCode: string;
  cbgDescription: string;
  careClass: CareClass;
  tariff: number;
  primaryDiagnosis: string | null;
  status: ClaimStatus;
  createdBy: string | null;
  createdAt: string;
}

const g = globalThis as unknown as { __abeccaClaims?: InacbgClaim[] };
const mem = g.__abeccaClaims ?? (g.__abeccaClaims = []);

type Row = {
  id: string; company_id: string; encounter_id: string; patient_id: string;
  cbg_code: string; cbg_description: string; care_class: CareClass; tariff: number;
  primary_diagnosis: string | null; status: ClaimStatus; created_by: string | null; created_at: string;
};
const toClaim = (r: Row): InacbgClaim => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  cbgCode: r.cbg_code, cbgDescription: r.cbg_description, careClass: r.care_class,
  tariff: Number(r.tariff), primaryDiagnosis: r.primary_diagnosis, status: r.status,
  createdBy: r.created_by, createdAt: r.created_at,
});

const STATUSES: ClaimStatus[] = ["draft", "submitted", "approved", "rejected"];
export const isClaimStatus = (s: unknown): s is ClaimStatus =>
  typeof s === "string" && STATUSES.includes(s as ClaimStatus);

export async function latestClaim(
  companyId: string,
  encounterId: string,
): Promise<InacbgClaim | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("inacbg_claims")
      .select("*")
      .eq("company_id", companyId)
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? toClaim(data as Row) : undefined;
  }
  return mem
    .filter((c) => c.companyId === companyId && c.encounterId === encounterId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export async function createClaim(
  companyId: string,
  encounterId: string,
  patientId: string,
  input: { primaryDiagnosis: string | null; careClass: CareClass; createdBy?: string | null },
): Promise<InacbgClaim> {
  const group = groupByDiagnosis(input.primaryDiagnosis);
  const tariff = tariffForClass(group, input.careClass);
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("inacbg_claims")
      .insert({
        company_id: companyId, encounter_id: encounterId, patient_id: patientId,
        cbg_code: group.code, cbg_description: group.description, care_class: input.careClass,
        tariff, primary_diagnosis: input.primaryDiagnosis, status: "draft",
        created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create claim failed");
    return toClaim(data as Row);
  }
  const claim: InacbgClaim = {
    id: crypto.randomUUID(), companyId, encounterId, patientId,
    cbgCode: group.code, cbgDescription: group.description, careClass: input.careClass,
    tariff, primaryDiagnosis: input.primaryDiagnosis, status: "draft",
    createdBy: input.createdBy ?? null, createdAt: new Date().toISOString(),
  };
  mem.push(claim);
  return claim;
}

export async function setClaimStatus(
  companyId: string,
  id: string,
  status: ClaimStatus,
): Promise<InacbgClaim | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("inacbg_claims")
      .update({ status })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toClaim(data as Row) : undefined;
  }
  const c = mem.find((x) => x.companyId === companyId && x.id === id);
  if (!c) return undefined;
  c.status = status;
  return c;
}

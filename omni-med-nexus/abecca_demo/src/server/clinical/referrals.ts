/**
 * Referrals (rujukan). An outgoing referral against an encounter — the record
 * behind a SISRUTE / BPJS rujukan when a patient must move to another facility
 * for a higher level of care. Tenant-scoped by company_id; env-gated.
 */
import { getSupabase } from "../supabase";

export type ReferralUrgency = "rutin" | "segera" | "emergensi";
export const REFERRAL_URGENCIES: ReferralUrgency[] = ["rutin", "segera", "emergensi"];

export interface Referral {
  id: string;
  companyId: string;
  encounterId: string;
  patientId: string;
  destinationFacility: string;
  reason: string;
  urgency: ReferralUrgency;
  notes: string | null;
  referredBy: string | null;
  createdAt: string;
}

export interface CreateReferralInput {
  patientId: string;
  destinationFacility: string;
  reason: string;
  urgency?: ReferralUrgency;
  notes?: string | null;
  referredBy?: string | null;
}

const g = globalThis as unknown as { __abeccaReferrals?: Referral[] };
const mem = g.__abeccaReferrals ?? (g.__abeccaReferrals = []);

type Row = {
  id: string; company_id: string; encounter_id: string; patient_id: string;
  destination_facility: string; reason: string; urgency: ReferralUrgency;
  notes: string | null; referred_by: string | null; created_at: string;
};
const toReferral = (r: Row): Referral => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  destinationFacility: r.destination_facility, reason: r.reason, urgency: r.urgency,
  notes: r.notes, referredBy: r.referred_by, createdAt: r.created_at,
});

const normUrgency = (u?: ReferralUrgency): ReferralUrgency =>
  u && REFERRAL_URGENCIES.includes(u) ? u : "rutin";

export async function createReferral(
  companyId: string,
  encounterId: string,
  input: CreateReferralInput,
): Promise<Referral> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("referrals")
      .insert({
        company_id: companyId,
        encounter_id: encounterId,
        patient_id: input.patientId,
        destination_facility: input.destinationFacility,
        reason: input.reason,
        urgency: normUrgency(input.urgency),
        notes: input.notes ?? null,
        referred_by: input.referredBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create referral failed");
    return toReferral(data as Row);
  }
  const referral: Referral = {
    id: crypto.randomUUID(),
    companyId,
    encounterId,
    patientId: input.patientId,
    destinationFacility: input.destinationFacility,
    reason: input.reason,
    urgency: normUrgency(input.urgency),
    notes: input.notes ?? null,
    referredBy: input.referredBy ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(referral);
  return referral;
}

export async function listReferrals(
  companyId: string,
  encounterId: string,
): Promise<Referral[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("referrals")
      .select("*")
      .eq("company_id", companyId)
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => toReferral(r as Row));
  }
  return mem
    .filter((r) => r.companyId === companyId && r.encounterId === encounterId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

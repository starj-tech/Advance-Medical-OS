/**
 * Informed-consent register — per-patient consent records (compliance: UU PDP / GDPR /
 * HIPAA / KARS). Stores the decision + who consented (grantor/relationship) + optional
 * validity; the effective status is derived (lib/consent). Withdrawal is non-destructive
 * (stamps withdrawnAt) so the audit trail of consent is preserved. Tenant-scoped; env-gated.
 */
import { getSupabase } from "../supabase";
import { effectiveStatus, type ConsentType, type ConsentDecision, type ConsentStatus } from "@/lib/consent";

export interface ConsentRecord {
  id: string;
  companyId: string;
  patientId: string;
  consentType: ConsentType;
  decision: ConsentDecision;
  grantor: string;
  relationship: string | null;
  scope: string | null;
  validUntil: string | null;
  withdrawnAt: string | null;
  createdAt: string;
}

type Row = {
  id: string; company_id: string; patient_id: string; consent_type: string; decision: string;
  grantor: string; relationship: string | null; scope: string | null;
  valid_until: string | null; withdrawn_at: string | null; created_at: string;
};
const toRecord = (r: Row): ConsentRecord => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, consentType: r.consent_type as ConsentType,
  decision: r.decision as ConsentDecision, grantor: r.grantor, relationship: r.relationship,
  scope: r.scope, validUntil: r.valid_until, withdrawnAt: r.withdrawn_at, createdAt: r.created_at,
});

const g = globalThis as unknown as { __abeccaConsents?: ConsentRecord[] };
const consents = g.__abeccaConsents ?? (g.__abeccaConsents = []);

export async function recordConsent(
  companyId: string,
  input: { patientId: string; consentType: ConsentType; grantor: string; relationship?: string | null; scope?: string | null; validUntil?: string | null; createdBy?: string | null },
): Promise<ConsentRecord> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("consents")
      .insert({
        company_id: companyId, patient_id: input.patientId, consent_type: input.consentType, decision: "granted",
        grantor: input.grantor, relationship: input.relationship ?? null, scope: input.scope ?? null,
        valid_until: input.validUntil ?? null, created_by: input.createdBy ?? null,
      })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "record consent failed");
    return toRecord(data as Row);
  }
  const rec: ConsentRecord = {
    id: crypto.randomUUID(), companyId, patientId: input.patientId, consentType: input.consentType, decision: "granted",
    grantor: input.grantor, relationship: input.relationship ?? null, scope: input.scope ?? null,
    validUntil: input.validUntil ?? null, withdrawnAt: null, createdAt: new Date().toISOString(),
  };
  consents.push(rec);
  return rec;
}

export async function listConsents(companyId: string, opts: { patientId?: string } = {}): Promise<ConsentRecord[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("consents").select("*").eq("company_id", companyId);
    if (opts.patientId) q = q.eq("patient_id", opts.patientId);
    const { data } = await q.order("created_at", { ascending: false });
    return (data ?? []).map((r) => toRecord(r as Row));
  }
  return consents
    .filter((c) => c.companyId === companyId && (!opts.patientId || c.patientId === opts.patientId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Withdraw a consent (non-destructive — stamps withdrawnAt). */
export async function withdrawConsent(companyId: string, id: string): Promise<ConsentRecord | undefined> {
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("consents").update({ decision: "withdrawn", withdrawn_at: now }).eq("company_id", companyId).eq("id", id).select("*").maybeSingle();
    return data ? toRecord(data as Row) : undefined;
  }
  const rec = consents.find((c) => c.companyId === companyId && c.id === id);
  if (!rec) return undefined;
  rec.decision = "withdrawn";
  rec.withdrawnAt = now;
  return rec;
}

export interface ConsentSummary {
  total: number;
  byStatus: Record<ConsentStatus, number>;
}

export async function consentSummary(companyId: string, now: Date): Promise<ConsentSummary> {
  const all = await listConsents(companyId);
  const byStatus: Record<ConsentStatus, number> = { active: 0, expired: 0, withdrawn: 0 };
  for (const c of all) byStatus[effectiveStatus(c, now)] += 1;
  return { total: all.length, byStatus };
}

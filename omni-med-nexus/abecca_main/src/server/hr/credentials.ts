/**
 * Health-worker credential registry (STR/SIP/…). Stores the licence facts; the
 * validity status is always derived from the expiry date at read time (lib/
 * credentials) so the board never shows a stale "valid". Tenant-scoped; env-gated
 * (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";
import { credentialStatus, type CredentialType, type CredentialStatus } from "@/lib/credentials";

export interface StaffCredential {
  id: string;
  companyId: string;
  staffName: string;
  profession: string;
  credentialType: CredentialType;
  number: string;
  issuedDate: string | null;
  expiryDate: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface CreateCredentialInput {
  staffName: string;
  profession: string;
  credentialType: CredentialType;
  number: string;
  expiryDate: string;
  issuedDate?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

type Row = {
  id: string; company_id: string; staff_name: string; profession: string;
  credential_type: CredentialType; number: string; issued_date: string | null;
  expiry_date: string; notes: string | null; created_by: string | null; created_at: string;
};
const toCred = (r: Row): StaffCredential => ({
  id: r.id, companyId: r.company_id, staffName: r.staff_name, profession: r.profession,
  credentialType: r.credential_type, number: r.number, issuedDate: r.issued_date,
  expiryDate: r.expiry_date, notes: r.notes, createdBy: r.created_by, createdAt: r.created_at,
});

const g = globalThis as unknown as { __abeccaCredentials?: StaffCredential[] };
const mem = g.__abeccaCredentials ?? (g.__abeccaCredentials = []);

export async function createCredential(
  companyId: string,
  input: CreateCredentialInput,
): Promise<StaffCredential> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("staff_credentials")
      .insert({
        company_id: companyId, staff_name: input.staffName, profession: input.profession,
        credential_type: input.credentialType, number: input.number,
        issued_date: input.issuedDate ?? null, expiry_date: input.expiryDate,
        notes: input.notes ?? null, created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create credential failed");
    return toCred(data as Row);
  }
  const cred: StaffCredential = {
    id: crypto.randomUUID(), companyId, staffName: input.staffName, profession: input.profession,
    credentialType: input.credentialType, number: input.number, issuedDate: input.issuedDate ?? null,
    expiryDate: input.expiryDate, notes: input.notes ?? null, createdBy: input.createdBy ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(cred);
  return cred;
}

/** Credentials sorted by expiry ascending — soonest to lapse first. */
export async function listCredentials(companyId: string): Promise<StaffCredential[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("staff_credentials").select("*").eq("company_id", companyId).order("expiry_date", { ascending: true });
    return (data ?? []).map((r) => toCred(r as Row));
  }
  return mem
    .filter((c) => c.companyId === companyId)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
}

export async function deleteCredential(companyId: string, id: string): Promise<boolean> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("staff_credentials").delete().eq("company_id", companyId).eq("id", id).select("id").maybeSingle();
    return !!data;
  }
  const i = mem.findIndex((c) => c.companyId === companyId && c.id === id);
  if (i < 0) return false;
  mem.splice(i, 1);
  return true;
}

export interface CredentialSummary {
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
}

/** Live counts by derived status (compliance dashboard). */
export async function summarizeCredentials(companyId: string, now: Date): Promise<CredentialSummary> {
  const all = await listCredentials(companyId);
  const summary: CredentialSummary = { total: all.length, valid: 0, expiringSoon: 0, expired: 0 };
  for (const c of all) {
    const status: CredentialStatus = credentialStatus(c.expiryDate, now);
    if (status === "valid") summary.valid += 1;
    else if (status === "expiring_soon") summary.expiringSoon += 1;
    else summary.expired += 1;
  }
  return summary;
}

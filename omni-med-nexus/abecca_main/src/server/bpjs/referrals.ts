/**
 * BPJS referrals (rujukan) looked up per encounter. Tenant-scoped; env-gated
 * (Supabase or in-memory). The lookup itself happens in server/bpjs/client
 * (mock or live VClaim); this persists the resolved referral so the SEP flow
 * and billing panel can reference it.
 */
import { getSupabase } from "../supabase";

export interface RujukanRecord {
  id: string;
  companyId: string;
  encounterId: string;
  patientId: string;
  noKartu: string;
  noRujukan: string;
  asalFaskes: string | null;
  diagnosaKode: string | null;
  diagnosaNama: string | null;
  tglRujukan: string | null;
  isMock: boolean;
  createdBy: string | null;
  createdAt: string;
}

const g = globalThis as unknown as { __abeccaRujukan?: RujukanRecord[] };
const mem = g.__abeccaRujukan ?? (g.__abeccaRujukan = []);

type Row = {
  id: string; company_id: string; encounter_id: string; patient_id: string;
  no_kartu: string; no_rujukan: string; asal_faskes: string | null;
  diagnosa_kode: string | null; diagnosa_nama: string | null; tgl_rujukan: string | null;
  is_mock: boolean; created_by: string | null; created_at: string;
};
const toRecord = (r: Row): RujukanRecord => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  noKartu: r.no_kartu, noRujukan: r.no_rujukan, asalFaskes: r.asal_faskes,
  diagnosaKode: r.diagnosa_kode, diagnosaNama: r.diagnosa_nama, tglRujukan: r.tgl_rujukan,
  isMock: r.is_mock, createdBy: r.created_by, createdAt: r.created_at,
});

export interface SaveRujukanInput {
  noKartu: string;
  noRujukan: string;
  asalFaskes?: string | null;
  diagnosaKode?: string | null;
  diagnosaNama?: string | null;
  tglRujukan?: string | null;
  isMock?: boolean;
  createdBy?: string | null;
}

export async function latestRujukan(
  companyId: string,
  encounterId: string,
): Promise<RujukanRecord | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("bpjs_rujukan")
      .select("*")
      .eq("company_id", companyId)
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? toRecord(data as Row) : undefined;
  }
  return mem
    .filter((r) => r.companyId === companyId && r.encounterId === encounterId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export async function saveRujukan(
  companyId: string,
  encounterId: string,
  patientId: string,
  input: SaveRujukanInput,
): Promise<RujukanRecord> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("bpjs_rujukan")
      .insert({
        company_id: companyId, encounter_id: encounterId, patient_id: patientId,
        no_kartu: input.noKartu, no_rujukan: input.noRujukan, asal_faskes: input.asalFaskes ?? null,
        diagnosa_kode: input.diagnosaKode ?? null, diagnosa_nama: input.diagnosaNama ?? null,
        tgl_rujukan: input.tglRujukan ?? null, is_mock: input.isMock ?? false,
        created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "save rujukan failed");
    return toRecord(data as Row);
  }
  const rec: RujukanRecord = {
    id: crypto.randomUUID(), companyId, encounterId, patientId,
    noKartu: input.noKartu, noRujukan: input.noRujukan, asalFaskes: input.asalFaskes ?? null,
    diagnosaKode: input.diagnosaKode ?? null, diagnosaNama: input.diagnosaNama ?? null,
    tglRujukan: input.tglRujukan ?? null, isMock: input.isMock ?? false,
    createdBy: input.createdBy ?? null, createdAt: new Date().toISOString(),
  };
  mem.push(rec);
  return rec;
}

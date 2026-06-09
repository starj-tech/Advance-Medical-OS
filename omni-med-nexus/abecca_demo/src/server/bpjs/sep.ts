/**
 * BPJS SEP records issued per encounter. Tenant-scoped; env-gated (Supabase or
 * in-memory). Issuance itself happens in server/bpjs/client (mock or live).
 */
import { getSupabase } from "../supabase";

export type SepStatus = "issued" | "cancelled";

export interface SepRecord {
  id: string;
  companyId: string;
  encounterId: string;
  patientId: string;
  noKartu: string;
  sepNumber: string;
  diagnosis: string | null;
  poli: string | null;
  pesertaNama: string | null;
  pesertaKelas: string | null;
  pesertaStatus: string | null;
  isMock: boolean;
  status: SepStatus;
  createdBy: string | null;
  createdAt: string;
}

const g = globalThis as unknown as { __abeccaSep?: SepRecord[] };
const mem = g.__abeccaSep ?? (g.__abeccaSep = []);

type Row = {
  id: string; company_id: string; encounter_id: string; patient_id: string;
  no_kartu: string; sep_number: string; diagnosis: string | null; poli: string | null;
  peserta_nama: string | null; peserta_kelas: string | null; peserta_status: string | null;
  is_mock: boolean; status: SepStatus; created_by: string | null; created_at: string;
};
const toRecord = (r: Row): SepRecord => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  noKartu: r.no_kartu, sepNumber: r.sep_number, diagnosis: r.diagnosis, poli: r.poli,
  pesertaNama: r.peserta_nama, pesertaKelas: r.peserta_kelas, pesertaStatus: r.peserta_status,
  isMock: r.is_mock, status: r.status, createdBy: r.created_by, createdAt: r.created_at,
});

export interface SaveSepInput {
  noKartu: string;
  sepNumber: string;
  diagnosis?: string | null;
  poli?: string | null;
  pesertaNama?: string | null;
  pesertaKelas?: string | null;
  pesertaStatus?: string | null;
  isMock?: boolean;
  createdBy?: string | null;
}

export async function latestSep(companyId: string, encounterId: string): Promise<SepRecord | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("bpjs_sep")
      .select("*")
      .eq("company_id", companyId)
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? toRecord(data as Row) : undefined;
  }
  return mem
    .filter((s) => s.companyId === companyId && s.encounterId === encounterId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export async function saveSep(
  companyId: string,
  encounterId: string,
  patientId: string,
  input: SaveSepInput,
): Promise<SepRecord> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("bpjs_sep")
      .insert({
        company_id: companyId, encounter_id: encounterId, patient_id: patientId,
        no_kartu: input.noKartu, sep_number: input.sepNumber, diagnosis: input.diagnosis ?? null,
        poli: input.poli ?? null, peserta_nama: input.pesertaNama ?? null,
        peserta_kelas: input.pesertaKelas ?? null, peserta_status: input.pesertaStatus ?? null,
        is_mock: input.isMock ?? false, status: "issued", created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "save SEP failed");
    return toRecord(data as Row);
  }
  const rec: SepRecord = {
    id: crypto.randomUUID(), companyId, encounterId, patientId,
    noKartu: input.noKartu, sepNumber: input.sepNumber, diagnosis: input.diagnosis ?? null,
    poli: input.poli ?? null, pesertaNama: input.pesertaNama ?? null,
    pesertaKelas: input.pesertaKelas ?? null, pesertaStatus: input.pesertaStatus ?? null,
    isMock: input.isMock ?? false, status: "issued", createdBy: input.createdBy ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(rec);
  return rec;
}

export async function setSepStatus(
  companyId: string,
  id: string,
  status: SepStatus,
): Promise<SepRecord | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("bpjs_sep").update({ status }).eq("company_id", companyId).eq("id", id).select("*").maybeSingle();
    return data ? toRecord(data as Row) : undefined;
  }
  const rec = mem.find((s) => s.companyId === companyId && s.id === id);
  if (!rec) return undefined;
  rec.status = status;
  return rec;
}

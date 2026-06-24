/**
 * Medication Administration Record (e-MAR). One row per administration event
 * against a medication order — the running record of the "5 benar". Tenant-scoped
 * by company_id; env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";

export type AdministrationStatus = "given" | "held" | "refused" | "missed";

export interface MedicationAdministration {
  id: string;
  companyId: string;
  orderId: string;
  encounterId: string;
  patientId: string;
  status: AdministrationStatus;
  doseGiven: string | null;
  note: string | null;
  administeredBy: string | null;
  administeredAt: string;
}

export interface RecordAdministrationInput {
  orderId: string;
  encounterId: string;
  patientId: string;
  status?: AdministrationStatus;
  doseGiven?: string | null;
  note?: string | null;
  administeredBy?: string | null;
}

const g = globalThis as unknown as { __abeccaMedAdmins?: MedicationAdministration[] };
const mem = g.__abeccaMedAdmins ?? (g.__abeccaMedAdmins = []);

type Row = {
  id: string; company_id: string; order_id: string; encounter_id: string;
  patient_id: string; status: AdministrationStatus; dose_given: string | null;
  note: string | null; administered_by: string | null; administered_at: string;
};
const toAdmin = (r: Row): MedicationAdministration => ({
  id: r.id, companyId: r.company_id, orderId: r.order_id, encounterId: r.encounter_id,
  patientId: r.patient_id, status: r.status, doseGiven: r.dose_given, note: r.note,
  administeredBy: r.administered_by, administeredAt: r.administered_at,
});

const STATUSES: AdministrationStatus[] = ["given", "held", "refused", "missed"];
const normStatus = (s?: AdministrationStatus): AdministrationStatus =>
  s && STATUSES.includes(s) ? s : "given";

export async function recordAdministration(
  companyId: string,
  input: RecordAdministrationInput,
): Promise<MedicationAdministration> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("medication_administrations")
      .insert({
        company_id: companyId,
        order_id: input.orderId,
        encounter_id: input.encounterId,
        patient_id: input.patientId,
        status: normStatus(input.status),
        dose_given: input.doseGiven ?? null,
        note: input.note ?? null,
        administered_by: input.administeredBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "record administration failed");
    return toAdmin(data as Row);
  }
  const admin: MedicationAdministration = {
    id: crypto.randomUUID(),
    companyId,
    orderId: input.orderId,
    encounterId: input.encounterId,
    patientId: input.patientId,
    status: normStatus(input.status),
    doseGiven: input.doseGiven ?? null,
    note: input.note ?? null,
    administeredBy: input.administeredBy ?? null,
    administeredAt: new Date().toISOString(),
  };
  mem.push(admin);
  return admin;
}

export async function listAdministrations(
  companyId: string,
  encounterId: string,
): Promise<MedicationAdministration[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("medication_administrations")
      .select("*")
      .eq("company_id", companyId)
      .eq("encounter_id", encounterId)
      .order("administered_at", { ascending: false });
    return (data ?? []).map((r) => toAdmin(r as Row));
  }
  return mem
    .filter((a) => a.companyId === companyId && a.encounterId === encounterId)
    .sort((a, b) => b.administeredAt.localeCompare(a.administeredAt));
}

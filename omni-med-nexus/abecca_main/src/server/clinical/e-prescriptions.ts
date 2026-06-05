/**
 * Electronic prescription export (e-resep ke apotek luar). Snapshots an
 * encounter's active CPOE medication orders into a single shareable prescription
 * with a human-readable code, an optional external pharmacy (apotek luar) and a
 * status running issued → dispensed / cancelled. Lets an outpatient fill their
 * script outside the hospital while keeping the record in the chart.
 * Tenant-scoped by company_id; env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";

export type EPrescriptionStatus = "issued" | "dispensed" | "cancelled";
export const EPRESCRIPTION_STATUSES: EPrescriptionStatus[] = ["issued", "dispensed", "cancelled"];

export interface EPrescriptionItem {
  drugName: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
}

export interface EPrescription {
  id: string;
  companyId: string;
  encounterId: string;
  patientId: string;
  code: string;
  pharmacy: string | null;
  items: EPrescriptionItem[];
  status: EPrescriptionStatus;
  issuedBy: string | null;
  createdAt: string;
}

export interface IssueEPrescriptionInput {
  patientId: string;
  pharmacy?: string | null;
  items: EPrescriptionItem[];
  issuedBy?: string | null;
}

const g = globalThis as unknown as { __abeccaEPrescriptions?: EPrescription[] };
const mem = g.__abeccaEPrescriptions ?? (g.__abeccaEPrescriptions = []);

/** Human-readable prescription number, e.g. RX-7F3A9C2D. */
function generateCode(): string {
  return `RX-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

type Row = {
  id: string; company_id: string; encounter_id: string; patient_id: string;
  code: string; pharmacy: string | null; items: EPrescriptionItem[];
  status: EPrescriptionStatus; issued_by: string | null; created_at: string;
};
const toRx = (r: Row): EPrescription => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  code: r.code, pharmacy: r.pharmacy, items: r.items ?? [], status: r.status,
  issuedBy: r.issued_by, createdAt: r.created_at,
});

export async function issueEPrescription(
  companyId: string,
  encounterId: string,
  input: IssueEPrescriptionInput,
): Promise<EPrescription> {
  const code = generateCode();
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("e_prescriptions")
      .insert({
        company_id: companyId,
        encounter_id: encounterId,
        patient_id: input.patientId,
        code,
        pharmacy: input.pharmacy ?? null,
        items: input.items,
        status: "issued",
        issued_by: input.issuedBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "issue e-prescription failed");
    return toRx(data as Row);
  }
  const rx: EPrescription = {
    id: crypto.randomUUID(),
    companyId,
    encounterId,
    patientId: input.patientId,
    code,
    pharmacy: input.pharmacy ?? null,
    items: input.items,
    status: "issued",
    issuedBy: input.issuedBy ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(rx);
  return rx;
}

/** E-prescriptions for an encounter, newest first. */
export async function listEPrescriptions(
  companyId: string,
  encounterId: string,
): Promise<EPrescription[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("e_prescriptions")
      .select("*")
      .eq("company_id", companyId)
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => toRx(r as Row));
  }
  return mem
    .filter((p) => p.companyId === companyId && p.encounterId === encounterId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function setEPrescriptionStatus(
  companyId: string,
  id: string,
  status: EPrescriptionStatus,
): Promise<EPrescription | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("e_prescriptions")
      .update({ status })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toRx(data as Row) : undefined;
  }
  const p = mem.find((x) => x.companyId === companyId && x.id === id);
  if (!p) return undefined;
  p.status = status;
  return p;
}

/**
 * Pharmacy dispensing — the step that closes the medication loop between CPOE
 * e-prescribing (medication_orders) and the e-MAR. A pharmacist verifies an
 * active order and dispenses it; the dispense is recorded here and the matching
 * formulary line is depleted (server/db.decrementStock). Tenant-scoped by
 * company_id; env-gated (Supabase or in-memory) like the rest of the BFF.
 */
import { getSupabase } from "../supabase";

export interface Dispense {
  id: string;
  companyId: string;
  orderId: string;
  encounterId: string;
  patientId: string;
  formularyId: number | null;
  drugName: string;
  quantity: number;
  dispensedBy: string | null;
  dispensedAt: string;
}

export interface RecordDispenseInput {
  orderId: string;
  encounterId: string;
  patientId: string;
  formularyId?: number | null;
  drugName: string;
  quantity: number;
  dispensedBy?: string | null;
}

const g = globalThis as unknown as { __abeccaDispenses?: Dispense[] };
const mem = g.__abeccaDispenses ?? (g.__abeccaDispenses = []);

type Row = {
  id: string; company_id: string; order_id: string; encounter_id: string;
  patient_id: string; formulary_id: number | null; drug_name: string;
  quantity: number; dispensed_by: string | null; dispensed_at: string;
};
const toDispense = (r: Row): Dispense => ({
  id: r.id, companyId: r.company_id, orderId: r.order_id, encounterId: r.encounter_id,
  patientId: r.patient_id, formularyId: r.formulary_id, drugName: r.drug_name,
  quantity: r.quantity, dispensedBy: r.dispensed_by, dispensedAt: r.dispensed_at,
});

export async function recordDispense(
  companyId: string,
  input: RecordDispenseInput,
): Promise<Dispense> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("dispenses")
      .insert({
        company_id: companyId,
        order_id: input.orderId,
        encounter_id: input.encounterId,
        patient_id: input.patientId,
        formulary_id: input.formularyId ?? null,
        drug_name: input.drugName,
        quantity: input.quantity,
        dispensed_by: input.dispensedBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "record dispense failed");
    return toDispense(data as Row);
  }
  const dispense: Dispense = {
    id: crypto.randomUUID(),
    companyId,
    orderId: input.orderId,
    encounterId: input.encounterId,
    patientId: input.patientId,
    formularyId: input.formularyId ?? null,
    drugName: input.drugName,
    quantity: input.quantity,
    dispensedBy: input.dispensedBy ?? null,
    dispensedAt: new Date().toISOString(),
  };
  mem.push(dispense);
  return dispense;
}

export async function listAllDispenses(companyId: string): Promise<Dispense[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("dispenses")
      .select("*")
      .eq("company_id", companyId)
      .order("dispensed_at", { ascending: false });
    return (data ?? []).map((r) => toDispense(r as Row));
  }
  return mem
    .filter((d) => d.companyId === companyId)
    .sort((a, b) => b.dispensedAt.localeCompare(a.dispensedAt));
}

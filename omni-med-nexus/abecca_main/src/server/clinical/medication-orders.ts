/**
 * CPOE medication orders (e-prescribing). One row per prescribed drug on an
 * encounter; safety screening lives in lib/drug-safety and runs in the route at
 * order time. Tenant-scoped by company_id; env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";

export type MedicationOrderStatus = "active" | "held" | "stopped";

export interface MedicationOrder {
  id: string;
  companyId: string;
  encounterId: string;
  patientId: string;
  formularyId: number | null;
  drugName: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  status: MedicationOrderStatus;
  prescriberId: string | null;
  overrideReason: string | null;
  createdAt: string;
  stoppedAt: string | null;
}

export interface CreateMedicationOrderInput {
  patientId: string;
  formularyId?: number | null;
  drugName: string;
  dose?: string | null;
  route?: string | null;
  frequency?: string | null;
  prescriberId?: string | null;
  overrideReason?: string | null;
}

const g = globalThis as unknown as { __abeccaMedOrders?: MedicationOrder[] };
const mem = g.__abeccaMedOrders ?? (g.__abeccaMedOrders = []);

type Row = {
  id: string; company_id: string; encounter_id: string; patient_id: string;
  formulary_id: number | null; drug_name: string; dose: string | null;
  route: string | null; frequency: string | null; status: MedicationOrderStatus;
  prescriber_id: string | null; override_reason: string | null;
  created_at: string; stopped_at: string | null;
};
const toOrder = (r: Row): MedicationOrder => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  formularyId: r.formulary_id, drugName: r.drug_name, dose: r.dose, route: r.route,
  frequency: r.frequency, status: r.status, prescriberId: r.prescriber_id,
  overrideReason: r.override_reason, createdAt: r.created_at, stoppedAt: r.stopped_at,
});

export async function createMedicationOrder(
  companyId: string,
  encounterId: string,
  input: CreateMedicationOrderInput,
): Promise<MedicationOrder> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("medication_orders")
      .insert({
        company_id: companyId,
        encounter_id: encounterId,
        patient_id: input.patientId,
        formulary_id: input.formularyId ?? null,
        drug_name: input.drugName,
        dose: input.dose ?? null,
        route: input.route ?? null,
        frequency: input.frequency ?? null,
        status: "active",
        prescriber_id: input.prescriberId ?? null,
        override_reason: input.overrideReason ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create medication order failed");
    return toOrder(data as Row);
  }
  const order: MedicationOrder = {
    id: crypto.randomUUID(),
    companyId,
    encounterId,
    patientId: input.patientId,
    formularyId: input.formularyId ?? null,
    drugName: input.drugName,
    dose: input.dose ?? null,
    route: input.route ?? null,
    frequency: input.frequency ?? null,
    status: "active",
    prescriberId: input.prescriberId ?? null,
    overrideReason: input.overrideReason ?? null,
    createdAt: new Date().toISOString(),
    stoppedAt: null,
  };
  mem.push(order);
  return order;
}

export async function listMedicationOrders(
  companyId: string,
  encounterId: string,
): Promise<MedicationOrder[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("medication_orders")
      .select("*")
      .eq("company_id", companyId)
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });
    return (data ?? []).map((r) => toOrder(r as Row));
  }
  return mem
    .filter((o) => o.companyId === companyId && o.encounterId === encounterId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Active drug names for the same encounter — input to interaction screening. */
export async function activeDrugNames(
  companyId: string,
  encounterId: string,
): Promise<string[]> {
  const orders = await listMedicationOrders(companyId, encounterId);
  return orders.filter((o) => o.status === "active").map((o) => o.drugName);
}

export async function setMedicationOrderStatus(
  companyId: string,
  id: string,
  status: MedicationOrderStatus,
): Promise<MedicationOrder | undefined> {
  const stoppedAt = status === "stopped" ? new Date().toISOString() : null;
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("medication_orders")
      .update({ status, stopped_at: stoppedAt })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toOrder(data as Row) : undefined;
  }
  const o = mem.find((x) => x.companyId === companyId && x.id === id);
  if (!o) return undefined;
  o.status = status;
  o.stoppedAt = stoppedAt;
  return o;
}

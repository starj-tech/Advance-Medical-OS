/**
 * Nutrition / diet orders (order diet & terapi gizi). Per-encounter dietary
 * prescription: a diet type (e.g. Diet DM, TKTP, Rendah Garam), a feeding route
 * (oral / enteral / parenteral), an optional calorie target and restrictions
 * (pantangan). An order is active until discontinued. Tenant-scoped by
 * company_id; env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";

export type DietRoute = "oral" | "enteral" | "parenteral";
export const DIET_ROUTES: DietRoute[] = ["oral", "enteral", "parenteral"];

export type DietStatus = "active" | "discontinued";
export const DIET_STATUSES: DietStatus[] = ["active", "discontinued"];

export interface DietOrder {
  id: string;
  companyId: string;
  encounterId: string;
  patientId: string;
  dietType: string;
  route: DietRoute;
  caloriesKcal: number | null;
  restrictions: string | null;
  status: DietStatus;
  orderedBy: string | null;
  createdAt: string;
}

export interface AddDietOrderInput {
  patientId: string;
  dietType: string;
  route: DietRoute;
  caloriesKcal?: number | null;
  restrictions?: string | null;
  orderedBy?: string | null;
}

const g = globalThis as unknown as { __abeccaDietOrders?: DietOrder[] };
const mem = g.__abeccaDietOrders ?? (g.__abeccaDietOrders = []);

type Row = {
  id: string; company_id: string; encounter_id: string; patient_id: string;
  diet_type: string; route: DietRoute; calories_kcal: number | null;
  restrictions: string | null; status: DietStatus; ordered_by: string | null;
  created_at: string;
};
const toOrder = (r: Row): DietOrder => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  dietType: r.diet_type, route: r.route, caloriesKcal: r.calories_kcal,
  restrictions: r.restrictions, status: r.status, orderedBy: r.ordered_by,
  createdAt: r.created_at,
});

export async function addDietOrder(
  companyId: string,
  encounterId: string,
  input: AddDietOrderInput,
): Promise<DietOrder> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("diet_orders")
      .insert({
        company_id: companyId,
        encounter_id: encounterId,
        patient_id: input.patientId,
        diet_type: input.dietType,
        route: input.route,
        calories_kcal: input.caloriesKcal ?? null,
        restrictions: input.restrictions ?? null,
        status: "active",
        ordered_by: input.orderedBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "add diet order failed");
    return toOrder(data as Row);
  }
  const order: DietOrder = {
    id: crypto.randomUUID(),
    companyId,
    encounterId,
    patientId: input.patientId,
    dietType: input.dietType,
    route: input.route,
    caloriesKcal: input.caloriesKcal ?? null,
    restrictions: input.restrictions ?? null,
    status: "active",
    orderedBy: input.orderedBy ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(order);
  return order;
}

/** Diet orders for an encounter, newest first. */
export async function listDietOrders(
  companyId: string,
  encounterId: string,
): Promise<DietOrder[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("diet_orders")
      .select("*")
      .eq("company_id", companyId)
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => toOrder(r as Row));
  }
  return mem
    .filter((o) => o.companyId === companyId && o.encounterId === encounterId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function setDietOrderStatus(
  companyId: string,
  id: string,
  status: DietStatus,
): Promise<DietOrder | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("diet_orders")
      .update({ status })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toOrder(data as Row) : undefined;
  }
  const o = mem.find((x) => x.companyId === companyId && x.id === id);
  if (!o) return undefined;
  o.status = status;
  return o;
}

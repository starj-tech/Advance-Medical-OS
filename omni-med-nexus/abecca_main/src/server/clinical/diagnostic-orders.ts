/**
 * Lab & radiology (diagnostic) orders with a result lifecycle. Tenant-scoped by
 * company_id; env-gated (Supabase or in-memory). Catalogue lives in
 * lib/diagnostic-catalog (client-safe); this stores the placed orders + results.
 */
import { getSupabase } from "../supabase";
import type { DiagnosticCategory } from "@/lib/diagnostic-catalog";

export type DiagnosticPriority = "routine" | "urgent" | "stat";
export type DiagnosticStatus =
  | "ordered"
  | "collected"
  | "in_progress"
  | "resulted"
  | "verified"
  | "cancelled";

export interface DiagnosticOrder {
  id: string;
  companyId: string;
  encounterId: string;
  patientId: string;
  category: DiagnosticCategory;
  testCode: string;
  testName: string;
  priority: DiagnosticPriority;
  status: DiagnosticStatus;
  resultValue: string | null;
  resultNote: string | null;
  orderedBy: string | null;
  resultedBy: string | null;
  orderedAt: string;
  resultedAt: string | null;
}

export interface CreateDiagnosticOrderInput {
  category: DiagnosticCategory;
  testCode: string;
  testName: string;
  priority?: DiagnosticPriority;
  orderedBy?: string | null;
}

const g = globalThis as unknown as { __abeccaDiagOrders?: DiagnosticOrder[] };
const mem = g.__abeccaDiagOrders ?? (g.__abeccaDiagOrders = []);

type Row = {
  id: string; company_id: string; encounter_id: string; patient_id: string;
  category: DiagnosticCategory; test_code: string; test_name: string;
  priority: DiagnosticPriority; status: DiagnosticStatus; result_value: string | null;
  result_note: string | null; ordered_by: string | null; resulted_by: string | null;
  ordered_at: string; resulted_at: string | null;
};
const toOrder = (r: Row): DiagnosticOrder => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  category: r.category, testCode: r.test_code, testName: r.test_name, priority: r.priority,
  status: r.status, resultValue: r.result_value, resultNote: r.result_note,
  orderedBy: r.ordered_by, resultedBy: r.resulted_by, orderedAt: r.ordered_at,
  resultedAt: r.resulted_at,
});

const STATUSES: DiagnosticStatus[] = [
  "ordered", "collected", "in_progress", "resulted", "verified", "cancelled",
];
export const isDiagnosticStatus = (s: unknown): s is DiagnosticStatus =>
  typeof s === "string" && STATUSES.includes(s as DiagnosticStatus);
const PRIORITIES: DiagnosticPriority[] = ["routine", "urgent", "stat"];
const normPriority = (p?: DiagnosticPriority): DiagnosticPriority =>
  p && PRIORITIES.includes(p) ? p : "routine";

export async function createDiagnosticOrder(
  companyId: string,
  encounterId: string,
  patientId: string,
  input: CreateDiagnosticOrderInput,
): Promise<DiagnosticOrder> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("diagnostic_orders")
      .insert({
        company_id: companyId,
        encounter_id: encounterId,
        patient_id: patientId,
        category: input.category,
        test_code: input.testCode,
        test_name: input.testName,
        priority: normPriority(input.priority),
        status: "ordered",
        ordered_by: input.orderedBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create diagnostic order failed");
    return toOrder(data as Row);
  }
  const order: DiagnosticOrder = {
    id: crypto.randomUUID(),
    companyId,
    encounterId,
    patientId,
    category: input.category,
    testCode: input.testCode,
    testName: input.testName,
    priority: normPriority(input.priority),
    status: "ordered",
    resultValue: null,
    resultNote: null,
    orderedBy: input.orderedBy ?? null,
    resultedBy: null,
    orderedAt: new Date().toISOString(),
    resultedAt: null,
  };
  mem.push(order);
  return order;
}

export async function listDiagnosticOrders(
  companyId: string,
  encounterId: string,
): Promise<DiagnosticOrder[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("diagnostic_orders")
      .select("*")
      .eq("company_id", companyId)
      .eq("encounter_id", encounterId)
      .order("ordered_at", { ascending: false });
    return (data ?? []).map((r) => toOrder(r as Row));
  }
  return mem
    .filter((o) => o.companyId === companyId && o.encounterId === encounterId)
    .sort((a, b) => b.orderedAt.localeCompare(a.orderedAt));
}

export async function getDiagnosticOrder(
  companyId: string,
  id: string,
): Promise<DiagnosticOrder | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("diagnostic_orders").select("*").eq("company_id", companyId).eq("id", id).maybeSingle();
    return data ? toOrder(data as Row) : undefined;
  }
  return mem.find((o) => o.companyId === companyId && o.id === id);
}

export async function setDiagnosticStatus(
  companyId: string,
  id: string,
  status: DiagnosticStatus,
): Promise<DiagnosticOrder | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("diagnostic_orders")
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

/** Record a result; moves the order to `resulted`. */
export async function setDiagnosticResult(
  companyId: string,
  id: string,
  result: { value: string; note?: string | null; resultedBy?: string | null },
): Promise<DiagnosticOrder | undefined> {
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("diagnostic_orders")
      .update({
        status: "resulted",
        result_value: result.value,
        result_note: result.note ?? null,
        resulted_by: result.resultedBy ?? null,
        resulted_at: now,
      })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toOrder(data as Row) : undefined;
  }
  const o = mem.find((x) => x.companyId === companyId && x.id === id);
  if (!o) return undefined;
  o.status = "resulted";
  o.resultValue = result.value;
  o.resultNote = result.note ?? null;
  o.resultedBy = result.resultedBy ?? null;
  o.resultedAt = now;
  return o;
}

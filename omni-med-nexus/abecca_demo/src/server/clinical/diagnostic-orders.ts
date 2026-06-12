/**
 * Lab & radiology (diagnostic) orders with a full LIS-style lifecycle. Tenant-
 * scoped by company_id; env-gated (Supabase or in-memory). Catalogue + result
 * grading live in lib/diagnostic-catalog (client-safe); this stores the placed
 * orders, the specimen, the result + its flag, and the validation.
 *
 * Lifecycle: ordered → collected (specimen, accession) → in_progress → resulted
 * (value + flag) → verified (validated by Sp.PK / Ka. Lab) — or cancelled.
 */
import { getSupabase } from "../supabase";
import {
  evaluateResult,
  findTest,
  type DiagnosticCategory,
  type ResultFlag,
} from "@/lib/diagnostic-catalog";

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
  accession: string | null;
  collectedBy: string | null;
  collectedAt: string | null;
  resultValue: string | null;
  resultNote: string | null;
  resultFlag: ResultFlag | null;
  orderedBy: string | null;
  resultedBy: string | null;
  verifiedBy: string | null;
  orderedAt: string;
  resultedAt: string | null;
  verifiedAt: string | null;
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
  priority: DiagnosticPriority; status: DiagnosticStatus;
  accession: string | null; collected_by: string | null; collected_at: string | null;
  result_value: string | null; result_note: string | null; result_flag: ResultFlag | null;
  ordered_by: string | null; resulted_by: string | null; verified_by: string | null;
  ordered_at: string; resulted_at: string | null; verified_at: string | null;
};
const toOrder = (r: Row): DiagnosticOrder => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  category: r.category, testCode: r.test_code, testName: r.test_name, priority: r.priority,
  status: r.status, accession: r.accession, collectedBy: r.collected_by, collectedAt: r.collected_at,
  resultValue: r.result_value, resultNote: r.result_note, resultFlag: r.result_flag,
  orderedBy: r.ordered_by, resultedBy: r.resulted_by, verifiedBy: r.verified_by,
  orderedAt: r.ordered_at, resultedAt: r.resulted_at, verifiedAt: r.verified_at,
});

const STATUSES: DiagnosticStatus[] = [
  "ordered", "collected", "in_progress", "resulted", "verified", "cancelled",
];
export const isDiagnosticStatus = (s: unknown): s is DiagnosticStatus =>
  typeof s === "string" && STATUSES.includes(s as DiagnosticStatus);
const PRIORITIES: DiagnosticPriority[] = ["routine", "urgent", "stat"];
const normPriority = (p?: DiagnosticPriority): DiagnosticPriority =>
  p && PRIORITIES.includes(p) ? p : "routine";

/** Human-readable accession/barcode, e.g. LAB-20260612-3F9A. */
function genAccession(category: DiagnosticCategory): string {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${category === "lab" ? "LAB" : "RAD"}-${day}-${rand}`;
}

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
    accession: null,
    collectedBy: null,
    collectedAt: null,
    resultValue: null,
    resultNote: null,
    resultFlag: null,
    orderedBy: input.orderedBy ?? null,
    resultedBy: null,
    verifiedBy: null,
    orderedAt: new Date().toISOString(),
    resultedAt: null,
    verifiedAt: null,
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

/** Company-wide diagnostics worklist (lab/radiology staff), optionally filtered. */
export async function listAllDiagnosticOrders(
  companyId: string,
  opts?: { category?: DiagnosticCategory; status?: DiagnosticStatus },
): Promise<DiagnosticOrder[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("diagnostic_orders").select("*").eq("company_id", companyId);
    if (opts?.category) q = q.eq("category", opts.category);
    if (opts?.status) q = q.eq("status", opts.status);
    const { data } = await q.order("ordered_at", { ascending: true });
    return (data ?? []).map((r) => toOrder(r as Row));
  }
  return mem
    .filter(
      (o) =>
        o.companyId === companyId &&
        (!opts?.category || o.category === opts.category) &&
        (!opts?.status || o.status === opts.status),
    )
    .sort((a, b) => a.orderedAt.localeCompare(b.orderedAt));
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

/** Receive the specimen: assign an accession and move to `collected`. */
export async function collectSpecimen(
  companyId: string,
  id: string,
  input: { collectedBy?: string | null },
): Promise<DiagnosticOrder | undefined> {
  const existing = await getDiagnosticOrder(companyId, id);
  if (!existing) return undefined;
  const accession = existing.accession ?? genAccession(existing.category);
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("diagnostic_orders")
      .update({ status: "collected", accession, collected_by: input.collectedBy ?? null, collected_at: now })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toOrder(data as Row) : undefined;
  }
  existing.status = "collected";
  existing.accession = accession;
  existing.collectedBy = input.collectedBy ?? null;
  existing.collectedAt = now;
  return existing;
}

/** Record a result; computes the flag from the catalogue and moves to `resulted`. */
export async function setDiagnosticResult(
  companyId: string,
  id: string,
  result: { value: string; note?: string | null; resultedBy?: string | null },
): Promise<DiagnosticOrder | undefined> {
  const existing = await getDiagnosticOrder(companyId, id);
  if (!existing) return undefined;
  const flag = evaluateResult(findTest(existing.testCode), result.value);
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("diagnostic_orders")
      .update({
        status: "resulted",
        result_value: result.value,
        result_note: result.note ?? null,
        result_flag: flag,
        resulted_by: result.resultedBy ?? null,
        resulted_at: now,
      })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toOrder(data as Row) : undefined;
  }
  existing.status = "resulted";
  existing.resultValue = result.value;
  existing.resultNote = result.note ?? null;
  existing.resultFlag = flag;
  existing.resultedBy = result.resultedBy ?? null;
  existing.resultedAt = now;
  return existing;
}

/** Validate a result (Sp.PK / Ka. Lab): moves `resulted` → `verified`. */
export async function verifyDiagnostic(
  companyId: string,
  id: string,
  input: { verifiedBy?: string | null },
): Promise<DiagnosticOrder | undefined> {
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("diagnostic_orders")
      .update({ status: "verified", verified_by: input.verifiedBy ?? null, verified_at: now })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toOrder(data as Row) : undefined;
  }
  const o = mem.find((x) => x.companyId === companyId && x.id === id);
  if (!o) return undefined;
  o.status = "verified";
  o.verifiedBy = input.verifiedBy ?? null;
  o.verifiedAt = now;
  return o;
}

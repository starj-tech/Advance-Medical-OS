/**
 * Patient billing — charges + payments accumulated per encounter (IDR integer
 * rupiah). Tenant-scoped by company_id; env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";

export type ChargeCategory = "tariff" | "medication" | "diagnostic" | "room" | "other";
export type PaymentMethod = "cash" | "qris" | "transfer" | "card" | "insurance";

export interface BillCharge {
  id: string;
  companyId: string;
  encounterId: string;
  patientId: string;
  description: string;
  category: ChargeCategory;
  unitPrice: number;
  qty: number;
  amount: number;
  createdBy: string | null;
  createdAt: string;
}

export interface BillPayment {
  id: string;
  companyId: string;
  encounterId: string;
  patientId: string;
  method: PaymentMethod;
  amount: number;
  receivedBy: string | null;
  createdAt: string;
}

export interface BillSummary {
  charges: BillCharge[];
  payments: BillPayment[];
  totalCharges: number;
  totalPaid: number;
  balance: number;
}

const g = globalThis as unknown as {
  __abeccaBilling?: { charges: BillCharge[]; payments: BillPayment[] };
};
const mem = g.__abeccaBilling ?? (g.__abeccaBilling = { charges: [], payments: [] });

type ChargeRow = {
  id: string; company_id: string; encounter_id: string; patient_id: string;
  description: string; category: ChargeCategory; unit_price: number; qty: number;
  amount: number; created_by: string | null; created_at: string;
};
type PaymentRow = {
  id: string; company_id: string; encounter_id: string; patient_id: string;
  method: PaymentMethod; amount: number; received_by: string | null; created_at: string;
};
const toCharge = (r: ChargeRow): BillCharge => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  description: r.description, category: r.category, unitPrice: Number(r.unit_price),
  qty: r.qty, amount: Number(r.amount), createdBy: r.created_by, createdAt: r.created_at,
});
const toPayment = (r: PaymentRow): BillPayment => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  method: r.method, amount: Number(r.amount), receivedBy: r.received_by, createdAt: r.created_at,
});

const CATEGORIES: ChargeCategory[] = ["tariff", "medication", "diagnostic", "room", "other"];
export const normCategory = (c: unknown): ChargeCategory =>
  typeof c === "string" && CATEGORIES.includes(c as ChargeCategory) ? (c as ChargeCategory) : "other";
const METHODS: PaymentMethod[] = ["cash", "qris", "transfer", "card", "insurance"];
export const isPaymentMethod = (m: unknown): m is PaymentMethod =>
  typeof m === "string" && METHODS.includes(m as PaymentMethod);

export async function addCharge(
  companyId: string,
  encounterId: string,
  patientId: string,
  input: { description: string; category?: ChargeCategory; unitPrice: number; qty?: number; createdBy?: string | null },
): Promise<BillCharge> {
  const qty = Math.max(1, Math.floor(input.qty ?? 1));
  const unitPrice = Math.max(0, Math.round(input.unitPrice));
  const amount = unitPrice * qty;
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("bill_charges")
      .insert({
        company_id: companyId, encounter_id: encounterId, patient_id: patientId,
        description: input.description, category: normCategory(input.category),
        unit_price: unitPrice, qty, amount, created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "add charge failed");
    return toCharge(data as ChargeRow);
  }
  const charge: BillCharge = {
    id: crypto.randomUUID(), companyId, encounterId, patientId,
    description: input.description, category: normCategory(input.category),
    unitPrice, qty, amount, createdBy: input.createdBy ?? null, createdAt: new Date().toISOString(),
  };
  mem.charges.push(charge);
  return charge;
}

export async function addPayment(
  companyId: string,
  encounterId: string,
  patientId: string,
  input: { method: PaymentMethod; amount: number; receivedBy?: string | null },
): Promise<BillPayment> {
  const amount = Math.max(0, Math.round(input.amount));
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("bill_payments")
      .insert({
        company_id: companyId, encounter_id: encounterId, patient_id: patientId,
        method: input.method, amount, received_by: input.receivedBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "add payment failed");
    return toPayment(data as PaymentRow);
  }
  const payment: BillPayment = {
    id: crypto.randomUUID(), companyId, encounterId, patientId,
    method: input.method, amount, receivedBy: input.receivedBy ?? null, createdAt: new Date().toISOString(),
  };
  mem.payments.push(payment);
  return payment;
}

export async function billSummary(companyId: string, encounterId: string): Promise<BillSummary> {
  const sb = getSupabase();
  let charges: BillCharge[];
  let payments: BillPayment[];
  if (sb) {
    const [c, p] = await Promise.all([
      sb.from("bill_charges").select("*").eq("company_id", companyId).eq("encounter_id", encounterId).order("created_at"),
      sb.from("bill_payments").select("*").eq("company_id", companyId).eq("encounter_id", encounterId).order("created_at"),
    ]);
    charges = (c.data ?? []).map((r) => toCharge(r as ChargeRow));
    payments = (p.data ?? []).map((r) => toPayment(r as PaymentRow));
  } else {
    charges = mem.charges
      .filter((x) => x.companyId === companyId && x.encounterId === encounterId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    payments = mem.payments
      .filter((x) => x.companyId === companyId && x.encounterId === encounterId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  const totalCharges = charges.reduce((s, c) => s + c.amount, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  return { charges, payments, totalCharges, totalPaid, balance: totalCharges - totalPaid };
}

/** A patient's running balance across every encounter — shown in the patient portal. */
export async function patientBalance(
  companyId: string,
  patientId: string,
): Promise<{ totalCharges: number; totalPaid: number; balance: number }> {
  const sb = getSupabase();
  let charges: BillCharge[];
  let payments: BillPayment[];
  if (sb) {
    const [c, p] = await Promise.all([
      sb.from("bill_charges").select("*").eq("company_id", companyId).eq("patient_id", patientId),
      sb.from("bill_payments").select("*").eq("company_id", companyId).eq("patient_id", patientId),
    ]);
    charges = (c.data ?? []).map((r) => toCharge(r as ChargeRow));
    payments = (p.data ?? []).map((r) => toPayment(r as PaymentRow));
  } else {
    charges = mem.charges.filter((x) => x.companyId === companyId && x.patientId === patientId);
    payments = mem.payments.filter((x) => x.companyId === companyId && x.patientId === patientId);
  }
  const totalCharges = charges.reduce((s, c) => s + c.amount, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  return { totalCharges, totalPaid, balance: totalCharges - totalPaid };
}

export interface RevenueSummary {
  totalCharges: number;
  totalPaid: number;
  outstanding: number;
  chargeCount: number;
  paymentCount: number;
}

/** Company-wide revenue rollup across every encounter — executive analytics. */
export async function revenueSummary(companyId: string): Promise<RevenueSummary> {
  const sb = getSupabase();
  let charges: BillCharge[];
  let payments: BillPayment[];
  if (sb) {
    const [c, p] = await Promise.all([
      sb.from("bill_charges").select("*").eq("company_id", companyId),
      sb.from("bill_payments").select("*").eq("company_id", companyId),
    ]);
    charges = (c.data ?? []).map((r) => toCharge(r as ChargeRow));
    payments = (p.data ?? []).map((r) => toPayment(r as PaymentRow));
  } else {
    charges = mem.charges.filter((x) => x.companyId === companyId);
    payments = mem.payments.filter((x) => x.companyId === companyId);
  }
  const totalCharges = charges.reduce((s, c) => s + c.amount, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  return {
    totalCharges,
    totalPaid,
    outstanding: totalCharges - totalPaid,
    chargeCount: charges.length,
    paymentCount: payments.length,
  };
}

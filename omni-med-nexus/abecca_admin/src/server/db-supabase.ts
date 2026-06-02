/**
 * Supabase-backed implementation of the Admin datastore.
 *
 * Mirrors the in-memory store in db.ts one-to-one, so db.ts can delegate here
 * whenever Supabase is configured. Tables/columns are snake_case; the
 * invoices.lines JSONB holds the same camelCase InvoiceLine shape as the TS
 * type. formulary/wards/staff/invoices are shared with the rest of the Abecca
 * suite (e.g. abecca_main dispenses from the same formulary), giving one source
 * of truth across apps.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FormularyItem,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  Staff,
  Ward,
} from "@/lib/types";

/* -------------------------------- row types ------------------------------- */

interface InvoiceRow {
  id: string;
  patient_id: string;
  patient_name: string;
  issued_at: string;
  status: InvoiceStatus;
  lines: InvoiceLine[] | null;
}

interface WardRow {
  id: string;
  name: string;
  department: string;
  total_beds: number;
  occupied_beds: number;
}

interface FormularyRow {
  id: number;
  medication_name: string;
  dosage: string;
  stock_quantity: number;
  reorder_level: number;
}

interface StaffRow {
  id: string;
  name: string;
  role: Staff["role"];
  department: string;
  shift: Staff["shift"];
  on_duty: boolean;
}

/* --------------------------------- mappers -------------------------------- */

function rowToInvoice(r: InvoiceRow): Invoice {
  return {
    id: r.id,
    patientId: r.patient_id,
    patientName: r.patient_name,
    issuedAt: r.issued_at,
    status: r.status,
    lines: r.lines ?? [],
  };
}

function rowToWard(r: WardRow): Ward {
  return {
    id: r.id,
    name: r.name,
    department: r.department,
    totalBeds: r.total_beds,
    occupiedBeds: r.occupied_beds,
  };
}

function rowToMed(r: FormularyRow): FormularyItem {
  return {
    id: r.id,
    medicationName: r.medication_name,
    dosage: r.dosage,
    stockQuantity: r.stock_quantity,
    reorderLevel: r.reorder_level,
  };
}

function rowToStaff(r: StaffRow): Staff {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    department: r.department,
    shift: r.shift,
    onDuty: r.on_duty,
  };
}

/* ---------------------------------- reads --------------------------------- */

export async function getInvoices(sb: SupabaseClient): Promise<Invoice[]> {
  const { data } = await sb
    .from("invoices")
    .select("*")
    .order("issued_at", { ascending: false })
    .order("id", { ascending: true })
    .returns<InvoiceRow[]>();
  return (data ?? []).map(rowToInvoice);
}

export async function getWards(sb: SupabaseClient): Promise<Ward[]> {
  const { data } = await sb
    .from("wards")
    .select("*")
    .order("id", { ascending: true })
    .returns<WardRow[]>();
  return (data ?? []).map(rowToWard);
}

export async function getFormulary(sb: SupabaseClient): Promise<FormularyItem[]> {
  const { data } = await sb
    .from("formulary")
    .select("*")
    .order("id", { ascending: true })
    .returns<FormularyRow[]>();
  return (data ?? []).map(rowToMed);
}

export async function getStaff(sb: SupabaseClient): Promise<Staff[]> {
  const { data } = await sb
    .from("staff")
    .select("*")
    .order("id", { ascending: true })
    .returns<StaffRow[]>();
  return (data ?? []).map(rowToStaff);
}

/* -------------------------------- mutations ------------------------------- */

export async function setInvoiceStatus(
  sb: SupabaseClient,
  id: string,
  status: InvoiceStatus,
): Promise<Invoice | undefined> {
  const { data } = await sb
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle<InvoiceRow>();
  if (!data) return undefined;
  await sb.from("invoices").update({ status }).eq("id", id);
  return rowToInvoice({ ...data, status });
}

export async function admitToWard(
  sb: SupabaseClient,
  wardId: string,
): Promise<Ward | undefined> {
  const { data } = await sb
    .from("wards")
    .select("*")
    .eq("id", wardId)
    .maybeSingle<WardRow>();
  if (!data) return undefined;
  const occupied = Math.min(data.total_beds, data.occupied_beds + 1);
  await sb.from("wards").update({ occupied_beds: occupied }).eq("id", wardId);
  return rowToWard({ ...data, occupied_beds: occupied });
}

export async function dischargeFromWard(
  sb: SupabaseClient,
  wardId: string,
): Promise<Ward | undefined> {
  const { data } = await sb
    .from("wards")
    .select("*")
    .eq("id", wardId)
    .maybeSingle<WardRow>();
  if (!data) return undefined;
  const occupied = Math.max(0, data.occupied_beds - 1);
  await sb.from("wards").update({ occupied_beds: occupied }).eq("id", wardId);
  return rowToWard({ ...data, occupied_beds: occupied });
}

export async function restockMedication(
  sb: SupabaseClient,
  medId: number,
  quantity: number,
): Promise<FormularyItem | undefined> {
  const { data } = await sb
    .from("formulary")
    .select("*")
    .eq("id", medId)
    .maybeSingle<FormularyRow>();
  if (!data) return undefined;
  const stock = data.stock_quantity + quantity;
  await sb.from("formulary").update({ stock_quantity: stock }).eq("id", medId);
  return rowToMed({ ...data, stock_quantity: stock });
}

export async function toggleStaffDuty(
  sb: SupabaseClient,
  id: string,
): Promise<Staff | undefined> {
  const { data } = await sb
    .from("staff")
    .select("*")
    .eq("id", id)
    .maybeSingle<StaffRow>();
  if (!data) return undefined;
  const onDuty = !data.on_duty;
  await sb.from("staff").update({ on_duty: onDuty }).eq("id", id);
  return rowToStaff({ ...data, on_duty: onDuty });
}

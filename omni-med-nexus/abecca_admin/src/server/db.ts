/**
 * Server datastore for the Abecca Admin BFF.
 *
 * Two interchangeable backends behind one async API:
 *   - Supabase (db-supabase.ts) when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *     are set — durable, shared across serverless instances and with the other
 *     Abecca apps (same formulary/wards/staff/invoices tables).
 *   - An in-memory process-global singleton otherwise — the zero-config
 *     preview/dev default; resets on restart.
 *
 * The HTTP contract is identical either way, so route handlers and the client
 * never change. Formulary and tariffs are seeded verbatim from
 * core_engine/src/database/seeder.rs; wards, staff and invoices are the
 * operational layer admins manage on top of the clinical core.
 */

import type {
  FormularyItem,
  Invoice,
  InvoiceStatus,
  Staff,
  Ward,
} from "@/lib/types";
import {
  seedFormulary,
  seedInvoices,
  seedStaff,
  seedWards,
} from "@/lib/data";
import { getSupabase } from "./supabase";
import * as supa from "./db-supabase";

/* ============================ in-memory backend ============================ */

type DB = {
  invoices: Invoice[];
  wards: Ward[];
  formulary: FormularyItem[];
  staff: Staff[];
};

function build(): DB {
  return {
    invoices: seedInvoices.map((i) => ({ ...i, lines: i.lines.map((l) => ({ ...l })) })),
    wards: seedWards.map((w) => ({ ...w })),
    formulary: seedFormulary.map((f) => ({ ...f })),
    staff: seedStaff.map((s) => ({ ...s })),
  };
}

const g = globalThis as unknown as { __abeccaAdminDb?: DB };
const db: DB = g.__abeccaAdminDb ?? (g.__abeccaAdminDb = build());

const memory = {
  getInvoices: (): Invoice[] => db.invoices,
  getWards: (): Ward[] => db.wards,
  getFormulary: (): FormularyItem[] => db.formulary,
  getStaff: (): Staff[] => db.staff,

  setInvoiceStatus: (id: string, status: InvoiceStatus): Invoice | undefined => {
    const inv = db.invoices.find((i) => i.id === id);
    if (!inv) return undefined;
    inv.status = status;
    return inv;
  },

  admitToWard: (wardId: string): Ward | undefined => {
    const w = db.wards.find((x) => x.id === wardId);
    if (!w) return undefined;
    w.occupiedBeds = Math.min(w.totalBeds, w.occupiedBeds + 1);
    return w;
  },

  dischargeFromWard: (wardId: string): Ward | undefined => {
    const w = db.wards.find((x) => x.id === wardId);
    if (!w) return undefined;
    w.occupiedBeds = Math.max(0, w.occupiedBeds - 1);
    return w;
  },

  restockMedication: (medId: number, quantity: number): FormularyItem | undefined => {
    const med = db.formulary.find((f) => f.id === medId);
    if (!med) return undefined;
    med.stockQuantity += quantity;
    return med;
  },

  toggleStaffDuty: (id: string): Staff | undefined => {
    const s = db.staff.find((x) => x.id === id);
    if (!s) return undefined;
    s.onDuty = !s.onDuty;
    return s;
  },
};

/* ============================== public API ================================ */
/* Async everywhere; delegates to Supabase when configured, else in-memory.   */

export async function getInvoices(): Promise<Invoice[]> {
  const sb = getSupabase();
  return sb ? supa.getInvoices(sb) : memory.getInvoices();
}

export async function getWards(): Promise<Ward[]> {
  const sb = getSupabase();
  return sb ? supa.getWards(sb) : memory.getWards();
}

export async function getFormulary(): Promise<FormularyItem[]> {
  const sb = getSupabase();
  return sb ? supa.getFormulary(sb) : memory.getFormulary();
}

export async function getStaff(): Promise<Staff[]> {
  const sb = getSupabase();
  return sb ? supa.getStaff(sb) : memory.getStaff();
}

export async function setInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): Promise<Invoice | undefined> {
  const sb = getSupabase();
  return sb ? supa.setInvoiceStatus(sb, id, status) : memory.setInvoiceStatus(id, status);
}

export async function admitToWard(wardId: string): Promise<Ward | undefined> {
  const sb = getSupabase();
  return sb ? supa.admitToWard(sb, wardId) : memory.admitToWard(wardId);
}

export async function dischargeFromWard(wardId: string): Promise<Ward | undefined> {
  const sb = getSupabase();
  return sb ? supa.dischargeFromWard(sb, wardId) : memory.dischargeFromWard(wardId);
}

export async function restockMedication(
  medId: number,
  quantity: number,
): Promise<FormularyItem | undefined> {
  const sb = getSupabase();
  return sb
    ? supa.restockMedication(sb, medId, quantity)
    : memory.restockMedication(medId, quantity);
}

export async function toggleStaffDuty(id: string): Promise<Staff | undefined> {
  const sb = getSupabase();
  return sb ? supa.toggleStaffDuty(sb, id) : memory.toggleStaffDuty(id);
}

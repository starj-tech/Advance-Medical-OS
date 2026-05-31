/**
 * In-memory server datastore for the Abecca Admin BFF.
 *
 * Real HTTP route handlers read and write this store, so the admin app talks to
 * an actual API. Formulary and tariffs are seeded verbatim from
 * core_engine/src/database/seeder.rs; wards, staff and invoices are the
 * operational layer admins manage on top of the clinical core.
 *
 * Process-global singleton so state survives across requests (and HMR) within a
 * running server; resets on restart. Swapping these bodies for calls to the
 * Rust core engine keeps the HTTP contract identical.
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

/* ---------------------------------- reads --------------------------------- */

export function getInvoices(): Invoice[] {
  return db.invoices;
}
export function getWards(): Ward[] {
  return db.wards;
}
export function getFormulary(): FormularyItem[] {
  return db.formulary;
}
export function getStaff(): Staff[] {
  return db.staff;
}

/* -------------------------------- mutations ------------------------------- */

export function setInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): Invoice | undefined {
  const inv = db.invoices.find((i) => i.id === id);
  if (!inv) return undefined;
  inv.status = status;
  return inv;
}

export function admitToWard(wardId: string): Ward | undefined {
  const w = db.wards.find((x) => x.id === wardId);
  if (!w) return undefined;
  w.occupiedBeds = Math.min(w.totalBeds, w.occupiedBeds + 1);
  return w;
}

export function dischargeFromWard(wardId: string): Ward | undefined {
  const w = db.wards.find((x) => x.id === wardId);
  if (!w) return undefined;
  w.occupiedBeds = Math.max(0, w.occupiedBeds - 1);
  return w;
}

export function restockMedication(
  medId: number,
  quantity: number,
): FormularyItem | undefined {
  const med = db.formulary.find((f) => f.id === medId);
  if (!med) return undefined;
  med.stockQuantity += quantity;
  return med;
}

export function toggleStaffDuty(id: string): Staff | undefined {
  const s = db.staff.find((x) => x.id === id);
  if (!s) return undefined;
  s.onDuty = !s.onDuty;
  return s;
}

"use client";

/**
 * In-memory admin store. Holds invoices, wards, formulary and staff so the
 * billing, bed-management, pharmacy and roster screens all perform real
 * actions and feed the dashboard live. Built on useSyncExternalStore, seeded
 * eagerly from the data layer (SSR and first client render match). In memory
 * only — resets on reload until a backend exists.
 */

import { useSyncExternalStore } from "react";
import type {
  FormularyItem,
  Invoice,
  InvoiceStatus,
  Staff,
  Ward,
} from "./types";
import {
  invoiceTotal,
  seedFormulary,
  seedInvoices,
  seedStaff,
  seedWards,
} from "./data";

type State = {
  invoices: Invoice[];
  wards: Ward[];
  formulary: FormularyItem[];
  staff: Staff[];
};

let state: State = {
  invoices: seedInvoices.map((i) => ({ ...i })),
  wards: seedWards.map((w) => ({ ...w })),
  formulary: seedFormulary.map((f) => ({ ...f })),
  staff: seedStaff.map((s) => ({ ...s })),
};

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/* --------------------------------- actions -------------------------------- */

export function setInvoiceStatus(id: string, status: InvoiceStatus) {
  state = {
    ...state,
    invoices: state.invoices.map((i) => (i.id === id ? { ...i, status } : i)),
  };
  emit();
}

/** Admit one patient into a ward (occupied +1, capped at capacity). */
export function admitToWard(wardId: string) {
  state = {
    ...state,
    wards: state.wards.map((w) =>
      w.id === wardId
        ? { ...w, occupiedBeds: Math.min(w.totalBeds, w.occupiedBeds + 1) }
        : w,
    ),
  };
  emit();
}

/** Discharge one patient from a ward (occupied -1, floored at 0). */
export function dischargeFromWard(wardId: string) {
  state = {
    ...state,
    wards: state.wards.map((w) =>
      w.id === wardId
        ? { ...w, occupiedBeds: Math.max(0, w.occupiedBeds - 1) }
        : w,
    ),
  };
  emit();
}

export function restockMedication(medId: number, quantity: number) {
  state = {
    ...state,
    formulary: state.formulary.map((f) =>
      f.id === medId ? { ...f, stockQuantity: f.stockQuantity + quantity } : f,
    ),
  };
  emit();
}

export function toggleStaffDuty(id: string) {
  state = {
    ...state,
    staff: state.staff.map((s) =>
      s.id === id ? { ...s, onDuty: !s.onDuty } : s,
    ),
  };
  emit();
}

/* --------------------------------- hooks ---------------------------------- */

const getInvoices = () => state.invoices;
const getWards = () => state.wards;
const getFormulary = () => state.formulary;
const getStaff = () => state.staff;

export function useInvoices(): Invoice[] {
  return useSyncExternalStore(subscribe, getInvoices, getInvoices);
}
export function useWards(): Ward[] {
  return useSyncExternalStore(subscribe, getWards, getWards);
}
export function useFormulary(): FormularyItem[] {
  return useSyncExternalStore(subscribe, getFormulary, getFormulary);
}
export function useStaff(): Staff[] {
  return useSyncExternalStore(subscribe, getStaff, getStaff);
}

/** Live billing + operational totals, recomputed from current state. */
export function useAdminOverview() {
  const inv = useInvoices();
  const wards = useWards();
  const formulary = useFormulary();
  const staff = useStaff();
  const totalBeds = wards.reduce((s, w) => s + w.totalBeds, 0);
  const occupied = wards.reduce((s, w) => s + w.occupiedBeds, 0);
  const revenue = inv
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + invoiceTotal(i), 0);
  const outstanding = inv
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + invoiceTotal(i), 0);
  return {
    totalBeds,
    occupied,
    occupancyRate: totalBeds ? occupied / totalBeds : 0,
    staffOnDuty: staff.filter((s) => s.onDuty).length,
    staffTotal: staff.length,
    revenue,
    outstanding,
    openInvoices: inv.filter((i) => i.status !== "paid").length,
    lowStock: formulary.filter((f) => f.stockQuantity <= f.reorderLevel).length,
  };
}

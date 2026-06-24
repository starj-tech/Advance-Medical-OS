"use client";

/**
 * Client store for the Abecca Admin portal — wired to the HTTP API.
 *
 * Eager seed gives SSR/first paint fully-populated state (the server datastore
 * is seeded from the same source, so the seed equals the API's initial state).
 * On first subscription the store revalidates from /api; every mutation calls
 * the API and pulls authoritative state back. Point NEXT_PUBLIC_API_BASE_URL at
 * the Rust core-engine API to switch backends without touching a screen.
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
import { api } from "./api";

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
let revalidated = false;

function setState(next: State) {
  state = next;
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (!revalidated) {
    revalidated = true;
    void pull();
  }
  return () => listeners.delete(cb);
}

async function pull() {
  try {
    const [invoices, wards, formulary, staff] = await Promise.all([
      api.invoices(),
      api.wards(),
      api.formulary(),
      api.staff(),
    ]);
    setState({ invoices, wards, formulary, staff });
  } catch {
    // keep current snapshot if the API is unreachable
  }
}

/* --------------------------------- actions -------------------------------- */

export async function setInvoiceStatus(id: string, status: InvoiceStatus) {
  await api.setInvoiceStatus(id, status);
  await pull();
}

export async function admitToWard(wardId: string) {
  await api.wardAction(wardId, "admit");
  await pull();
}

export async function dischargeFromWard(wardId: string) {
  await api.wardAction(wardId, "discharge");
  await pull();
}

export async function restockMedication(medId: number, quantity: number) {
  await api.restock(medId, quantity);
  await pull();
}

export async function toggleStaffDuty(id: string) {
  await api.toggleDuty(id);
  await pull();
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

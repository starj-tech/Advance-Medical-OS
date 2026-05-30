"use client";

/**
 * In-memory admin store. Holds the invoice ledger so billing actions (mark
 * paid / pending) update revenue and the dashboard live. Built on
 * useSyncExternalStore and seeded eagerly from the data layer so SSR and the
 * first client render match. State is in memory only (no backend yet) and
 * resets on reload.
 */

import { useSyncExternalStore } from "react";
import type { Invoice, InvoiceStatus } from "./types";
import {
  invoiceTotal,
  seedFormulary,
  seedInvoices,
  seedStaff,
  seedWards,
} from "./data";

let invoices: Invoice[] = seedInvoices.map((i) => ({ ...i }));
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setInvoiceStatus(id: string, status: InvoiceStatus) {
  invoices = invoices.map((i) => (i.id === id ? { ...i, status } : i));
  for (const l of listeners) l();
}

const getInvoicesSnapshot = () => invoices;

export function useInvoices(): Invoice[] {
  return useSyncExternalStore(
    subscribe,
    getInvoicesSnapshot,
    getInvoicesSnapshot,
  );
}

/** Live billing + operational totals, recomputed from the current ledger. */
export function useAdminOverview() {
  const inv = useInvoices();
  const totalBeds = seedWards.reduce((s, w) => s + w.totalBeds, 0);
  const occupied = seedWards.reduce((s, w) => s + w.occupiedBeds, 0);
  const revenue = inv
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + invoiceTotal(i), 0);
  const outstanding = inv
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + invoiceTotal(i), 0);
  return {
    totalBeds,
    occupied,
    occupancyRate: occupied / totalBeds,
    staffOnDuty: seedStaff.filter((s) => s.onDuty).length,
    staffTotal: seedStaff.length,
    revenue,
    outstanding,
    openInvoices: inv.filter((i) => i.status !== "paid").length,
    lowStock: seedFormulary.filter((f) => f.stockQuantity <= f.reorderLevel)
      .length,
  };
}

/**
 * Typed HTTP client for the Abecca Admin API (the Next.js BFF under /api).
 * Base URL via NEXT_PUBLIC_API_BASE_URL so it can later target the Rust API.
 */

import type {
  FormularyItem,
  Invoice,
  InvoiceStatus,
  Staff,
  Ward,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "content-type": "application/json" },
    cache: "no-store",
    ...init,
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  invoices: () => request<Invoice[]>("/invoices"),
  setInvoiceStatus: (id: string, status: InvoiceStatus) =>
    request<Invoice>(`/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  wards: () => request<Ward[]>("/wards"),
  wardAction: (id: string, op: "admit" | "discharge") =>
    request<Ward>(`/wards/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ op }),
    }),
  formulary: () => request<FormularyItem[]>("/formulary"),
  restock: (id: number, quantity: number) =>
    request<FormularyItem>(`/formulary/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ op: "restock", quantity }),
    }),
  staff: () => request<Staff[]>("/staff"),
  toggleDuty: (id: string) =>
    request<Staff>(`/staff/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ op: "toggleDuty" }),
    }),
};

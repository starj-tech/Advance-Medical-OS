/**
 * Typed HTTP client for the Abecca clinical API (the Next.js BFF under /api).
 *
 * The base URL is configurable via NEXT_PUBLIC_API_BASE_URL so the same client
 * can point at the in-app route handlers (default, empty base = same origin) or
 * at the Rust core-engine API once it is deployed.
 */

import type { AuditBlock, FormularyItem, Patient, Tariff } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "content-type": "application/json" },
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export type PatientAction =
  | { op: "vitals"; vitals: Omit<import("./types").VitalSigns, "ews" | "recordedAt"> }
  | { op: "diagnosis"; code: string }
  | { op: "note"; text: string }
  | { op: "transfer"; ward: string; bed: string }
  | { op: "discharge" };

export const api = {
  patients: () => request<Patient[]>("/patients"),
  patient: (id: string) => request<Patient>(`/patients/${id}`),
  admit: (body: Record<string, unknown>) =>
    request<Patient>("/patients", { method: "POST", body: JSON.stringify(body) }),
  patientAction: (id: string, body: PatientAction) =>
    request<Patient>(`/patients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  formulary: () => request<FormularyItem[]>("/formulary"),
  restock: (id: number, quantity: number) =>
    request<FormularyItem>(`/formulary/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ op: "restock", quantity }),
    }),
  dispense: (id: number, quantity: number, patientId: string) =>
    request<{ med: FormularyItem }>(`/formulary/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ op: "dispense", quantity, patientId }),
    }),
  tariffs: () => request<Tariff[]>("/tariffs"),
  audit: () => request<{ chain: AuditBlock[]; valid: boolean }>("/audit"),
};

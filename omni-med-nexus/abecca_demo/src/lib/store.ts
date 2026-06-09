"use client";

/**
 * Client store for the Abecca clinical portal — now wired to the HTTP API.
 *
 * Data flow:
 *   - Eager seed (from the shared data layer) is the initial snapshot, so SSR
 *     and the first client paint are fully populated with no flash. The server
 *     datastore is seeded from the same source, so the seed equals the API's
 *     initial state — the revalidation below is invisible on first load.
 *   - On first client subscription we revalidate from /api (no useEffect, no
 *     set-state-in-effect — the fetch is kicked from the store's subscribe).
 *   - Every mutation calls the API and then pulls authoritative state back,
 *     so the audit chain, stock levels and patient records always reflect what
 *     the server (the integration layer in front of core_engine) computed.
 *
 * Built on useSyncExternalStore so any component reads live state without a
 * provider. Point NEXT_PUBLIC_API_BASE_URL at the Rust core-engine API to
 * switch backends without touching a single screen.
 */

import { useSyncExternalStore } from "react";
import type { AuditBlock, FormularyItem, Patient, VitalSigns } from "./types";
import {
  isChainValid,
  seedAuditChain,
  seedFormulary,
  seedPatients,
} from "./data";
import { api } from "./api";

type State = {
  patients: Patient[];
  formulary: FormularyItem[];
  chain: AuditBlock[];
  chainValid: boolean;
};

let state: State = {
  patients: seedPatients.map((p) => ({ ...p })),
  formulary: seedFormulary.map((f) => ({ ...f })),
  chain: [...seedAuditChain],
  chainValid: isChainValid(seedAuditChain),
};

const listeners = new Set<() => void>();
let revalidated = false;

function setState(next: State) {
  state = next;
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  // Kick a one-time revalidation the first time a component subscribes (client
  // only). No effect/setState-in-effect: the store owns its own freshness.
  if (!revalidated) {
    revalidated = true;
    void pull();
  }
  return () => listeners.delete(cb);
}

/** Pull authoritative state from the API and replace the local snapshot. */
async function pull() {
  try {
    const [patients, formulary, audit] = await Promise.all([
      api.patients(),
      api.formulary(),
      api.audit(),
    ]);
    setState({ patients, formulary, chain: audit.chain, chainValid: audit.valid });
  } catch {
    // Offline / API unreachable: keep the current snapshot (seed) rather than
    // blanking the UI.
  }
}

/* --------------------------------- actions -------------------------------- */
/* Each awaits the API then pulls fresh state so the audit chain stays live.   */

export async function recordVitals(
  patientId: string,
  vitals: Omit<VitalSigns, "ews" | "recordedAt">,
) {
  await api.patientAction(patientId, { op: "vitals", vitals });
  await pull();
}

export async function addDiagnosis(patientId: string, code: string) {
  await api.patientAction(patientId, { op: "diagnosis", code });
  await pull();
}

export async function addNote(patientId: string, text: string) {
  if (!text.trim()) return;
  await api.patientAction(patientId, { op: "note", text });
  await pull();
}

export async function transferPatient(
  patientId: string,
  ward: string,
  bed: string,
) {
  await api.patientAction(patientId, { op: "transfer", ward, bed });
  await pull();
}

export async function dischargePatient(patientId: string) {
  await api.patientAction(patientId, { op: "discharge" });
  await pull();
}

export async function dispenseToPatient(
  patientId: string,
  medId: number,
  quantity: number,
) {
  await api.dispense(medId, quantity, patientId);
  await pull();
}

export async function restockMedication(medId: number, quantity: number) {
  await api.restock(medId, quantity);
  await pull();
}

export type NewPatientInput = {
  name: string;
  age: number;
  sex: "male" | "female";
  ward: string;
  bed: string;
  allergies: string[];
  vitals: Omit<VitalSigns, "ews" | "recordedAt">;
};

/** Admit via the API; returns the server-allocated patient id for navigation. */
export async function admitPatient(input: NewPatientInput): Promise<string> {
  const patient = await api.admit(input);
  await pull();
  return patient.id;
}

/* --------------------------------- hooks ---------------------------------- */

const getPatients = () => state.patients;
const getFormulary = () => state.formulary;
const getChain = () => state.chain;
const getChainValid = () => state.chainValid;

export function usePatients(): Patient[] {
  return useSyncExternalStore(subscribe, getPatients, getPatients);
}

export function useFormulary(): FormularyItem[] {
  return useSyncExternalStore(subscribe, getFormulary, getFormulary);
}

export function usePatient(id: string): Patient | undefined {
  return usePatients().find((p) => p.id === id);
}

export function useAuditChain(): AuditBlock[] {
  return useSyncExternalStore(subscribe, getChain, getChain);
}

export function useChainValid(): boolean {
  return useSyncExternalStore(subscribe, getChainValid, getChainValid);
}

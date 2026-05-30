"use client";

/**
 * In-memory clinical store for the Abecca portal.
 *
 * Holds the working set of patients and the audit chain, and exposes the
 * mutations a clinician performs (admit, discharge, record vitals, add a
 * diagnosis, dispense medication). Every mutation:
 *   - recomputes the Early Warning Score + acuity from the raw vitals, and
 *   - appends a SHA-256-style, hash-linked block to the audit chain — the same
 *     shape `core_engine::blockchain::audit_trail` produces.
 *
 * It is built on useSyncExternalStore so any component can read live state
 * without a context provider. State lives in memory only: there is no backend
 * API yet, so a reload returns to the seeded baseline. When a real core-engine
 * API exists, these action bodies become the only thing that changes.
 */

import { useSyncExternalStore } from "react";
import type {
  AuditAction,
  AuditBlock,
  Diagnosis,
  Patient,
  VitalSigns,
} from "./types";
import {
  icd10,
  isChainValid,
  pseudoHash,
  seedAuditChain,
  seedPatients,
} from "./data";
import { acuityFromEws, computeEws } from "./utils";

const ATTENDING = "DOC-456"; // the signed-in clinician (see topbar)

type State = {
  patients: Patient[];
  chain: AuditBlock[];
};

// Seed eagerly from the synchronous data layer so SSR and the first client
// render share identical, fully-populated state (no flash, no hydration gap).
// Arrays are cloned so client mutations never touch the shared module seed.
let state: State = {
  patients: seedPatients.map((p) => ({ ...p })),
  chain: [...seedAuditChain],
};
const listeners = new Set<() => void>();

function emit() {
  // New array refs already created by each action; just notify.
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Append a hash-linked block, mirroring audit_trail.rs add_audit_record. */
function appendBlock(patientId: string, action: AuditAction): AuditBlock {
  const prev = state.chain[state.chain.length - 1];
  const index = prev.index + 1;
  const timestamp = Math.floor(Date.now() / 1000);
  const hash = pseudoHash(
    `${index}${timestamp}${patientId}${action}${ATTENDING}${prev.hash}`,
  );
  return {
    index,
    timestamp,
    patientId,
    action,
    doctorId: ATTENDING,
    previousHash: prev.hash,
    hash,
  };
}

/* --------------------------------- actions -------------------------------- */

export function recordVitals(
  patientId: string,
  raw: Omit<VitalSigns, "ews" | "recordedAt">,
) {
  const ews = computeEws(raw);
  const vitals: VitalSigns = {
    ...raw,
    ews,
    recordedAt: new Date().toISOString(),
  };
  state = {
    ...state,
    patients: state.patients.map((p) =>
      p.id === patientId
        ? {
            ...p,
            vitals,
            vitalsHistory: [...p.vitalsHistory, vitals],
            acuity: acuityFromEws(ews),
          }
        : p,
    ),
    chain: [...state.chain, appendBlock(patientId, "UPDATE_EWS")],
  };
  emit();
}

export function addDiagnosis(patientId: string, code: string) {
  const diagnosis: Diagnosis = {
    code,
    description: icd10[code] ?? code,
    diagnosedAt: new Date().toISOString().slice(0, 10),
  };
  state = {
    ...state,
    patients: state.patients.map((p) =>
      p.id === patientId && !p.diagnoses.some((d) => d.code === code)
        ? { ...p, diagnoses: [...p.diagnoses, diagnosis] }
        : p,
    ),
    chain: [...state.chain, appendBlock(patientId, "UPDATE_DIAGNOSIS")],
  };
  emit();
}

export function dispenseMedication(patientId: string) {
  state = {
    ...state,
    chain: [...state.chain, appendBlock(patientId, "DISPENSE_MEDICATION")],
  };
  emit();
}

export function dischargePatient(patientId: string) {
  state = {
    ...state,
    patients: state.patients.map((p) =>
      p.id === patientId
        ? { ...p, dischargedAt: new Date().toISOString().slice(0, 10) }
        : p,
    ),
    chain: [...state.chain, appendBlock(patientId, "DISCHARGE_PATIENT")],
  };
  emit();
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

export function admitPatient(input: NewPatientInput): string {
  // Allocate the next PAT-id from the current max.
  const maxNum = state.patients.reduce((m, p) => {
    const n = Number(p.id.replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 100);
  const id = `PAT-${maxNum + 1}`;
  const ews = computeEws(input.vitals);
  const now = new Date();
  const vitals: VitalSigns = {
    ...input.vitals,
    ews,
    recordedAt: now.toISOString(),
  };
  const patient: Patient = {
    id,
    name: input.name,
    maskedSsn: `•••• •••• ${String(1000 + ((maxNum + 1) % 9000))}`,
    age: input.age,
    sex: input.sex,
    ward: input.ward,
    bed: input.bed,
    admittedAt: now.toISOString().slice(0, 10),
    attendingDoctorId: ATTENDING,
    acuity: acuityFromEws(ews),
    vitals,
    vitalsHistory: [vitals],
    diagnoses: [],
    allergies: input.allergies,
  };
  state = {
    ...state,
    patients: [patient, ...state.patients],
    chain: [...state.chain, appendBlock(id, "ADMIT_PATIENT")],
  };
  emit();
  return id;
}

/* --------------------------------- hooks ---------------------------------- */

const getPatientsSnapshot = () => state.patients;
const getChainSnapshot = () => state.chain;

export function usePatients(): Patient[] {
  return useSyncExternalStore(
    subscribe,
    getPatientsSnapshot,
    getPatientsSnapshot,
  );
}

export function usePatient(id: string): Patient | undefined {
  return usePatients().find((p) => p.id === id);
}

export function useAuditChain(): AuditBlock[] {
  return useSyncExternalStore(subscribe, getChainSnapshot, getChainSnapshot);
}

export function useChainValid(): boolean {
  const chain = useAuditChain();
  return isChainValid(chain);
}

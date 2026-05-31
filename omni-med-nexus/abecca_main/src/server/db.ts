/**
 * In-memory server datastore for the Abecca clinical BFF.
 *
 * This is the integration layer the README describes as "not yet built": real
 * HTTP route handlers read and write this store, so the front-end talks to an
 * actual API rather than a client-only cache. It is seeded from the same data
 * that mirrors core_engine/src/database/seeder.rs (icd10_codes, formulary,
 * tariffs) plus a representative set of patients shaped like the encrypted
 * `patients` table.
 *
 * Persistence model: a process-global singleton, so state survives across
 * requests (and HMR) within a running server. It resets when the server
 * restarts — appropriate for a preview/BFF. Swapping these function bodies for
 * calls to the Rust core engine (once it exposes an API) is the only change
 * needed to make this durable; the HTTP contract stays identical.
 */

import type {
  AuditAction,
  AuditBlock,
  ClinicalNote,
  Diagnosis,
  FormularyItem,
  Patient,
  Tariff,
  VitalSigns,
} from "@/lib/types";
import { icd10, seedFormulary, seedPatients, seedTariffs } from "@/lib/data";
import { acuityFromEws, computeEws } from "@/lib/utils";
import { genesisBlock, isChainValid, makeBlock } from "./audit";

const ATTENDING = "DOC-456";

type DB = {
  patients: Patient[];
  formulary: FormularyItem[];
  tariffs: Tariff[];
  chain: AuditBlock[];
};

function build(): DB {
  const patients = seedPatients.map((p) => ({
    ...p,
    vitals: { ...p.vitals },
    vitalsHistory: p.vitalsHistory.map((v) => ({ ...v })),
    diagnoses: p.diagnoses.map((d) => ({ ...d })),
    allergies: [...p.allergies],
    notes: p.notes.map((n) => ({ ...n })),
  }));

  // Genesis + one ADMIT block per seeded patient, so the ledger has history.
  const chain: AuditBlock[] = [genesisBlock()];
  for (const p of patients) {
    chain.push(
      makeBlock(
        chain[chain.length - 1],
        p.id,
        "ADMIT_PATIENT",
        p.attendingDoctorId,
        Math.floor(new Date(p.admittedAt).getTime() / 1000),
      ),
    );
  }

  return {
    patients,
    formulary: seedFormulary.map((f) => ({ ...f })),
    tariffs: seedTariffs.map((t) => ({ ...t })),
    chain,
  };
}

// Process-global singleton (survives requests + HMR in a single server).
const g = globalThis as unknown as { __abeccaMainDb?: DB };
const db: DB = g.__abeccaMainDb ?? (g.__abeccaMainDb = build());

function append(patientId: string, action: AuditAction, doctorId = ATTENDING) {
  db.chain.push(makeBlock(db.chain[db.chain.length - 1], patientId, action, doctorId));
}

/* ---------------------------------- reads --------------------------------- */

export function getPatients(): Patient[] {
  return db.patients;
}
export function getPatient(id: string): Patient | undefined {
  return db.patients.find((p) => p.id === id);
}
export function getFormulary(): FormularyItem[] {
  return db.formulary;
}
export function getTariffs(): Tariff[] {
  return db.tariffs;
}
export function getIcd10(): Record<string, string> {
  return icd10;
}
export function getAudit(): { chain: AuditBlock[]; valid: boolean } {
  return { chain: db.chain, valid: isChainValid(db.chain) };
}

/* -------------------------------- mutations ------------------------------- */

export type RawVitals = Omit<VitalSigns, "ews" | "recordedAt">;

export function recordVitals(id: string, raw: RawVitals): Patient | undefined {
  const p = getPatient(id);
  if (!p) return undefined;
  const ews = computeEws(raw);
  const vitals: VitalSigns = { ...raw, ews, recordedAt: new Date().toISOString() };
  p.vitals = vitals;
  p.vitalsHistory = [...p.vitalsHistory, vitals];
  p.acuity = acuityFromEws(ews);
  append(id, "UPDATE_EWS");
  return p;
}

export function addDiagnosis(id: string, code: string): Patient | undefined {
  const p = getPatient(id);
  if (!p) return undefined;
  if (!p.diagnoses.some((d) => d.code === code)) {
    const diagnosis: Diagnosis = {
      code,
      description: icd10[code] ?? code,
      diagnosedAt: new Date().toISOString().slice(0, 10),
    };
    p.diagnoses = [...p.diagnoses, diagnosis];
    append(id, "UPDATE_DIAGNOSIS");
  }
  return p;
}

export function addNote(id: string, text: string): Patient | undefined {
  const p = getPatient(id);
  if (!p) return undefined;
  const trimmed = text.trim();
  if (!trimmed) return p;
  const note: ClinicalNote = {
    id: `N-${Date.now()}`,
    text: trimmed,
    author: ATTENDING,
    createdAt: new Date().toISOString(),
  };
  p.notes = [...p.notes, note];
  append(id, "ADD_NOTE");
  return p;
}

export function transferPatient(
  id: string,
  ward: string,
  bed: string,
): Patient | undefined {
  const p = getPatient(id);
  if (!p) return undefined;
  p.ward = ward;
  p.bed = bed;
  append(id, "TRANSFER_PATIENT");
  return p;
}

export function dischargePatient(id: string): Patient | undefined {
  const p = getPatient(id);
  if (!p) return undefined;
  p.dischargedAt = new Date().toISOString().slice(0, 10);
  append(id, "DISCHARGE_PATIENT");
  return p;
}

export function dispenseToPatient(
  id: string,
  medId: number,
  quantity: number,
): { patient?: Patient; med?: FormularyItem } {
  const p = getPatient(id);
  const med = db.formulary.find((f) => f.id === medId);
  if (med) med.stockQuantity = Math.max(0, med.stockQuantity - quantity);
  if (p) append(id, "DISPENSE_MEDICATION");
  return { patient: p, med };
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

export type NewPatientInput = {
  id?: string;
  name: string;
  age: number;
  sex: "male" | "female";
  ward: string;
  bed: string;
  allergies: string[];
  vitals: RawVitals;
};

export function admitPatient(input: NewPatientInput): Patient {
  const maxNum = db.patients.reduce((m, p) => {
    const n = Number(p.id.replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 100);
  const id = input.id ?? `PAT-${maxNum + 1}`;
  const ews = computeEws(input.vitals);
  const now = new Date();
  const vitals: VitalSigns = { ...input.vitals, ews, recordedAt: now.toISOString() };
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
    notes: [],
  };
  // Replace if the client pre-allocated this id (keeps client/server in sync).
  db.patients = [patient, ...db.patients.filter((p) => p.id !== id)];
  append(id, "ADMIT_PATIENT");
  return patient;
}

/**
 * Server datastore for the Abecca clinical BFF.
 *
 * Two interchangeable backends behind one async API:
 *   - Supabase (db-supabase.ts) when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *     are set — durable, shared across serverless instances.
 *   - An in-memory process-global singleton otherwise — the zero-config
 *     preview/dev default. State survives requests + HMR within one running
 *     server and resets on restart.
 *
 * Either way the HTTP contract is identical, so route handlers and the client
 * never change. The in-memory seed mirrors core_engine/src/database/seeder.rs
 * (icd10_codes, formulary, tariffs) plus a representative set of patients shaped
 * like the encrypted `patients` table; the audit chain is built like
 * core_engine/src/blockchain (genesis + linked SHA-256 records).
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
import { getSupabase } from "./supabase";
import * as supa from "./db-supabase";

const ATTENDING = "DOC-456";

export type RawVitals = Omit<VitalSigns, "ews" | "recordedAt">;

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

/* ============================ in-memory backend ============================ */

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

const memory = {
  getPatients: (): Patient[] => db.patients,
  getPatient: (id: string): Patient | undefined =>
    db.patients.find((p) => p.id === id),
  getFormulary: (): FormularyItem[] => db.formulary,
  getTariffs: (): Tariff[] => db.tariffs,
  getIcd10: (): Record<string, string> => icd10,
  getAudit: (): { chain: AuditBlock[]; valid: boolean } => ({
    chain: db.chain,
    valid: isChainValid(db.chain),
  }),

  recordVitals: (id: string, raw: RawVitals): Patient | undefined => {
    const p = memory.getPatient(id);
    if (!p) return undefined;
    const ews = computeEws(raw);
    const vitals: VitalSigns = { ...raw, ews, recordedAt: new Date().toISOString() };
    p.vitals = vitals;
    p.vitalsHistory = [...p.vitalsHistory, vitals];
    p.acuity = acuityFromEws(ews);
    append(id, "UPDATE_EWS");
    return p;
  },

  addDiagnosis: (id: string, code: string): Patient | undefined => {
    const p = memory.getPatient(id);
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
  },

  addNote: (id: string, text: string): Patient | undefined => {
    const p = memory.getPatient(id);
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
  },

  transferPatient: (id: string, ward: string, bed: string): Patient | undefined => {
    const p = memory.getPatient(id);
    if (!p) return undefined;
    p.ward = ward;
    p.bed = bed;
    append(id, "TRANSFER_PATIENT");
    return p;
  },

  dischargePatient: (id: string): Patient | undefined => {
    const p = memory.getPatient(id);
    if (!p) return undefined;
    p.dischargedAt = new Date().toISOString().slice(0, 10);
    append(id, "DISCHARGE_PATIENT");
    return p;
  },

  dispenseToPatient: (
    id: string,
    medId: number,
    quantity: number,
  ): { patient?: Patient; med?: FormularyItem } => {
    const p = memory.getPatient(id);
    const med = db.formulary.find((f) => f.id === medId);
    if (med) med.stockQuantity = Math.max(0, med.stockQuantity - quantity);
    if (p) append(id, "DISPENSE_MEDICATION");
    return { patient: p, med };
  },

  restockMedication: (medId: number, quantity: number): FormularyItem | undefined => {
    const med = db.formulary.find((f) => f.id === medId);
    if (!med) return undefined;
    med.stockQuantity += quantity;
    return med;
  },

  admitPatient: (input: NewPatientInput): Patient => {
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
  },
};

/* ============================== public API ================================ */
/* Async everywhere; delegates to Supabase when configured, else in-memory.   */

export async function getPatients(): Promise<Patient[]> {
  const sb = getSupabase();
  return sb ? supa.getPatients(sb) : memory.getPatients();
}

export async function getPatient(id: string): Promise<Patient | undefined> {
  const sb = getSupabase();
  return sb ? supa.getPatient(sb, id) : memory.getPatient(id);
}

export async function getFormulary(): Promise<FormularyItem[]> {
  const sb = getSupabase();
  return sb ? supa.getFormulary(sb) : memory.getFormulary();
}

export async function getTariffs(): Promise<Tariff[]> {
  const sb = getSupabase();
  return sb ? supa.getTariffs(sb) : memory.getTariffs();
}

export async function getIcd10(): Promise<Record<string, string>> {
  const sb = getSupabase();
  return sb ? supa.getIcd10(sb) : memory.getIcd10();
}

export async function getAudit(): Promise<{ chain: AuditBlock[]; valid: boolean }> {
  const sb = getSupabase();
  return sb ? supa.getAudit(sb) : memory.getAudit();
}

export async function recordVitals(
  id: string,
  raw: RawVitals,
): Promise<Patient | undefined> {
  const sb = getSupabase();
  return sb ? supa.recordVitals(sb, id, raw) : memory.recordVitals(id, raw);
}

export async function addDiagnosis(
  id: string,
  code: string,
): Promise<Patient | undefined> {
  const sb = getSupabase();
  return sb ? supa.addDiagnosis(sb, id, code) : memory.addDiagnosis(id, code);
}

export async function addNote(
  id: string,
  text: string,
): Promise<Patient | undefined> {
  const sb = getSupabase();
  return sb ? supa.addNote(sb, id, text) : memory.addNote(id, text);
}

export async function transferPatient(
  id: string,
  ward: string,
  bed: string,
): Promise<Patient | undefined> {
  const sb = getSupabase();
  return sb
    ? supa.transferPatient(sb, id, ward, bed)
    : memory.transferPatient(id, ward, bed);
}

export async function dischargePatient(id: string): Promise<Patient | undefined> {
  const sb = getSupabase();
  return sb ? supa.dischargePatient(sb, id) : memory.dischargePatient(id);
}

export async function dispenseToPatient(
  id: string,
  medId: number,
  quantity: number,
): Promise<{ patient?: Patient; med?: FormularyItem }> {
  const sb = getSupabase();
  return sb
    ? supa.dispenseToPatient(sb, id, medId, quantity)
    : memory.dispenseToPatient(id, medId, quantity);
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

export async function admitPatient(input: NewPatientInput): Promise<Patient> {
  const sb = getSupabase();
  return sb ? supa.admitPatient(sb, input) : memory.admitPatient(input);
}

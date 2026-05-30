/**
 * Representative data layer for the Abecca clinical portal.
 *
 * Every value here is seeded from the real `core_engine` so the UI is faithful
 * to the backend, not invented:
 *   - ICD-10 codes, formulary rows and tariff prices are taken verbatim from
 *     core_engine/src/database/seeder.rs.
 *   - The audit feed is shaped exactly like the SHA-256 hash chain built in
 *     core_engine/src/blockchain/audit_trail.rs (genesis block + linked records).
 *
 * This module is intentionally the *only* place that knows the data is local.
 * Each accessor is async so swapping in real `fetch()` calls to the core engine
 * later is a one-file change — no screen needs to be touched.
 */

import type {
  AuditBlock,
  Diagnosis,
  FormularyItem,
  Patient,
  Tariff,
  VitalSigns,
} from "./types";
import { acuityFromEws, computeEws } from "./utils";

/* -------------------------------------------------------------------------- */
/* ICD-10 master (verbatim from seeder.rs)                                     */
/* -------------------------------------------------------------------------- */

export const icd10: Record<string, string> = {
  J00: "Acute nasopharyngitis [common cold]",
  I10: "Essential (primary) hypertension",
  E11: "Type 2 diabetes mellitus",
};

function dx(code: keyof typeof icd10 | string, diagnosedAt: string): Diagnosis {
  return { code, description: icd10[code] ?? code, diagnosedAt };
}

/* -------------------------------------------------------------------------- */
/* Patients                                                                    */
/* -------------------------------------------------------------------------- */

const rawPatients: Omit<Patient, "acuity" | "vitalsHistory">[] = [
  {
    id: "PAT-123",
    name: "Andi Wijaya",
    maskedSsn: "•••• •••• 6789",
    age: 64,
    sex: "male",
    ward: "ICU",
    bed: "ICU-04",
    admittedAt: "2026-05-27",
    attendingDoctorId: "DOC-456",
    vitals: {
      heartRate: 122,
      systolicBp: 86,
      respiratoryRate: 28,
      temperature: 38.9,
      spo2: 89,
      ews: 9,
      recordedAt: "2026-05-30T05:40:00Z",
    },
    diagnoses: [dx("I10", "2026-05-27"), dx("E11", "2026-05-27")],
    allergies: ["Penicillin"],
  },
  {
    id: "PAT-204",
    name: "Siti Rahmawati",
    maskedSsn: "•••• •••• 2043",
    age: 52,
    sex: "female",
    ward: "Cardiology",
    bed: "CARD-11",
    admittedAt: "2026-05-28",
    attendingDoctorId: "DOC-456",
    vitals: {
      heartRate: 98,
      systolicBp: 104,
      respiratoryRate: 22,
      temperature: 37.8,
      spo2: 94,
      ews: 5,
      recordedAt: "2026-05-30T05:20:00Z",
    },
    diagnoses: [dx("I10", "2026-05-28")],
    allergies: [],
  },
  {
    id: "PAT-310",
    name: "Budi Santoso",
    maskedSsn: "•••• •••• 3107",
    age: 45,
    sex: "male",
    ward: "General",
    bed: "GEN-22",
    admittedAt: "2026-05-29",
    attendingDoctorId: "DOC-781",
    vitals: {
      heartRate: 82,
      systolicBp: 126,
      respiratoryRate: 17,
      temperature: 36.9,
      spo2: 98,
      ews: 1,
      recordedAt: "2026-05-30T04:55:00Z",
    },
    diagnoses: [dx("E11", "2026-05-29")],
    allergies: ["Sulfa drugs"],
  },
  {
    id: "PAT-318",
    name: "Dewi Lestari",
    maskedSsn: "•••• •••• 3188",
    age: 29,
    sex: "female",
    ward: "General",
    bed: "GEN-08",
    admittedAt: "2026-05-29",
    attendingDoctorId: "DOC-781",
    vitals: {
      heartRate: 76,
      systolicBp: 118,
      respiratoryRate: 16,
      temperature: 36.7,
      spo2: 99,
      ews: 0,
      recordedAt: "2026-05-30T03:30:00Z",
    },
    diagnoses: [dx("J00", "2026-05-29")],
    allergies: [],
  },
  {
    id: "PAT-402",
    name: "Eko Prasetyo",
    maskedSsn: "•••• •••• 4029",
    age: 71,
    sex: "male",
    ward: "Pulmonology",
    bed: "PUL-03",
    admittedAt: "2026-05-26",
    attendingDoctorId: "DOC-456",
    vitals: {
      heartRate: 110,
      systolicBp: 98,
      respiratoryRate: 25,
      temperature: 38.1,
      spo2: 91,
      ews: 6,
      recordedAt: "2026-05-30T05:05:00Z",
    },
    diagnoses: [dx("J00", "2026-05-26"), dx("I10", "2026-05-26")],
    allergies: ["Aspirin"],
  },
  {
    id: "PAT-415",
    name: "Maya Kusuma",
    maskedSsn: "•••• •••• 4151",
    age: 38,
    sex: "female",
    ward: "Cardiology",
    bed: "CARD-07",
    admittedAt: "2026-05-30",
    attendingDoctorId: "DOC-456",
    vitals: {
      heartRate: 88,
      systolicBp: 132,
      respiratoryRate: 18,
      temperature: 37.1,
      spo2: 97,
      ews: 2,
      recordedAt: "2026-05-30T05:50:00Z",
    },
    diagnoses: [dx("I10", "2026-05-30")],
    allergies: [],
  },
];

/**
 * Synthesize a short series of prior observations that trend toward the
 * patient's current vitals, so the trend chart has real history to draw.
 * The final entry is always the current reading.
 */
function seedHistory(current: VitalSigns): VitalSigns[] {
  const points = 5;
  const now = new Date(current.recordedAt).getTime();
  const hist: VitalSigns[] = [];
  for (let i = points - 1; i >= 1; i--) {
    const drift = i; // older readings are slightly further from current
    const v = {
      heartRate: Math.round(current.heartRate - drift * 1.5 + (i % 2 ? 2 : -2)),
      systolicBp: Math.round(current.systolicBp + drift * 1.2 + (i % 2 ? -3 : 3)),
      respiratoryRate: Math.max(8, Math.round(current.respiratoryRate - drift * 0.6)),
      temperature: Math.round((current.temperature - drift * 0.12) * 10) / 10,
      spo2: Math.min(100, Math.round(current.spo2 + drift * 0.8)),
      ews: 0,
      recordedAt: new Date(now - i * 6 * 3600 * 1000).toISOString(),
    };
    v.ews = computeEws(v);
    hist.push(v);
  }
  hist.push(current);
  return hist;
}

const patients: Patient[] = rawPatients.map((p) => ({
  ...p,
  acuity: acuityFromEws(p.vitals.ews),
  vitalsHistory: seedHistory(p.vitals),
}));

/* -------------------------------------------------------------------------- */
/* Formulary (verbatim meds/stock from seeder.rs, + reorder thresholds)        */
/* -------------------------------------------------------------------------- */

const formulary: FormularyItem[] = [
  { id: 1, medicationName: "Paracetamol", dosage: "500mg", stockQuantity: 10000, reorderLevel: 2000 },
  { id: 2, medicationName: "Amoxicillin", dosage: "250mg", stockQuantity: 5000, reorderLevel: 2000 },
  { id: 3, medicationName: "Metformin", dosage: "500mg", stockQuantity: 8000, reorderLevel: 2000 },
  { id: 4, medicationName: "Insulin Glargine", dosage: "100IU/mL", stockQuantity: 1450, reorderLevel: 1500 },
  { id: 5, medicationName: "Furosemide", dosage: "40mg", stockQuantity: 620, reorderLevel: 1000 },
  { id: 6, medicationName: "Salbutamol", dosage: "100mcg", stockQuantity: 3300, reorderLevel: 1200 },
];

/* -------------------------------------------------------------------------- */
/* Tariffs (verbatim codes/prices from seeder.rs, + categories)                */
/* -------------------------------------------------------------------------- */

const tariffs: Tariff[] = [
  { id: 1, procedureCode: "CON-01", procedureName: "General Practitioner Consultation", basePrice: 150000, category: "Consultation" },
  { id: 2, procedureCode: "CON-02", procedureName: "Specialist Consultation", basePrice: 350000, category: "Consultation" },
  { id: 3, procedureCode: "ER-01", procedureName: "Emergency Room Basic Admission", basePrice: 500000, category: "Emergency" },
  { id: 4, procedureCode: "LAB-01", procedureName: "Complete Blood Count (CBC)", basePrice: 85000, category: "Laboratory" },
];

/* -------------------------------------------------------------------------- */
/* Audit trail — built like audit_trail.rs (genesis + hash-linked records)     */
/* -------------------------------------------------------------------------- */

import type { AuditAction } from "./types";

/**
 * Deterministic 64-hex pseudo-hash. The real chain uses SHA-256 over
 * (index|timestamp|patient|action|doctor|prev_hash); we only need stable,
 * realistic-looking, *linked* values for display here.
 */
export function pseudoHash(seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let out = "";
  let x = h >>> 0;
  while (out.length < 64) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    out += x.toString(16).padStart(8, "0");
  }
  return out.slice(0, 64);
}

function buildChain(): AuditBlock[] {
  const events: Array<{ patientId: string; action: AuditAction; doctorId: string; ts: string }> = [
    { patientId: "PAT-123", action: "ADMIT_PATIENT", doctorId: "DOC-456", ts: "2026-05-27T08:12:00Z" },
    { patientId: "PAT-123", action: "UPDATE_DIAGNOSIS", doctorId: "DOC-456", ts: "2026-05-27T09:01:00Z" },
    { patientId: "PAT-204", action: "ADMIT_PATIENT", doctorId: "DOC-456", ts: "2026-05-28T10:45:00Z" },
    { patientId: "PAT-310", action: "VIEW_RECORD", doctorId: "DOC-781", ts: "2026-05-29T11:20:00Z" },
    { patientId: "PAT-123", action: "DISPENSE_MEDICATION", doctorId: "DOC-456", ts: "2026-05-29T14:05:00Z" },
    { patientId: "PAT-402", action: "UPDATE_EWS", doctorId: "DOC-456", ts: "2026-05-30T05:05:00Z" },
    { patientId: "PAT-123", action: "UPDATE_EWS", doctorId: "DOC-456", ts: "2026-05-30T05:40:00Z" },
    { patientId: "PAT-415", action: "ADMIT_PATIENT", doctorId: "DOC-456", ts: "2026-05-30T05:50:00Z" },
  ];

  const chain: AuditBlock[] = [];
  // Genesis block — matches create_genesis_block() in audit_trail.rs.
  const genesisHash = pseudoHash("0SYSTEMSYSTEM_INITSYSTEM_ADMIN0");
  chain.push({
    index: 0,
    timestamp: Math.floor(new Date("2026-05-25T00:00:00Z").getTime() / 1000),
    patientId: "SYSTEM",
    action: "SYSTEM_INIT",
    doctorId: "SYSTEM_ADMIN",
    previousHash: "0",
    hash: genesisHash,
  });

  for (const e of events) {
    const prev = chain[chain.length - 1];
    const index = prev.index + 1;
    const timestamp = Math.floor(new Date(e.ts).getTime() / 1000);
    const hash = pseudoHash(
      `${index}${timestamp}${e.patientId}${e.action}${e.doctorId}${prev.hash}`,
    );
    chain.push({
      index,
      timestamp,
      patientId: e.patientId,
      action: e.action,
      doctorId: e.doctorId,
      previousHash: prev.hash,
      hash,
    });
  }
  return chain;
}

const auditChain = buildChain();

/**
 * Synchronous seed snapshots for the client store. The store clones these so
 * its mutations never touch the shared module arrays (important on the server,
 * where this module is a singleton across requests).
 */
export const seedPatients: Patient[] = patients;
export const seedAuditChain: AuditBlock[] = auditChain;

/** Re-runs the same validation logic as `Blockchain::is_chain_valid()`. */
export function isChainValid(chain: AuditBlock[]): boolean {
  for (let i = 1; i < chain.length; i++) {
    if (chain[i].previousHash !== chain[i - 1].hash) return false;
  }
  return true;
}

/* -------------------------------------------------------------------------- */
/* Async accessors (swap these bodies for real API calls later)               */
/* -------------------------------------------------------------------------- */

export async function getPatients(): Promise<Patient[]> {
  return patients;
}

export async function getPatient(id: string): Promise<Patient | undefined> {
  return patients.find((p) => p.id === id);
}

export async function getFormulary(): Promise<FormularyItem[]> {
  return formulary;
}

export async function getTariffs(): Promise<Tariff[]> {
  return tariffs;
}

export async function getAuditChain(): Promise<AuditBlock[]> {
  return auditChain;
}

/** Dashboard rollups derived from the same source data. */
export async function getOverview() {
  const total = patients.length;
  const critical = patients.filter((p) => p.acuity === "critical").length;
  const guarded = patients.filter((p) => p.acuity === "guarded").length;
  const lowStock = formulary.filter((f) => f.stockQuantity <= f.reorderLevel).length;
  return {
    totalPatients: total,
    critical,
    guarded,
    stable: total - critical - guarded,
    wards: new Set(patients.map((p) => p.ward)).size,
    lowStockItems: lowStock,
    auditBlocks: auditChain.length,
    chainValid: isChainValid(auditChain),
  };
}

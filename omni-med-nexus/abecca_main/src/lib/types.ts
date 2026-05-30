/**
 * Domain types for the Abecca clinical portal.
 *
 * These mirror the structures defined in the Rust `core_engine` so the UI maps
 * one-to-one onto the real backend once an HTTP/API layer exists:
 *   - Block / audit trail .......... core_engine/src/blockchain/{block,audit_trail}.rs
 *   - patients ..................... core_engine/src/database/seeder.rs (patients)
 *   - formulary .................... core_engine/src/database/seeder.rs (formulary)
 *   - tariffs ...................... core_engine/src/database/seeder.rs (tariffs)
 *   - icd10_codes .................. core_engine/src/database/seeder.rs (icd10_codes)
 *
 * PII fields (SSN, medical history) are AES-256-GCM encrypted at rest in the
 * core engine; the portal only ever works with already-decrypted, access-checked
 * views and never holds the ciphertext.
 */

/** Audit actions recorded on the tamper-evident chain (see block.rs comments). */
export type AuditAction =
  | "SYSTEM_INIT"
  | "VIEW_RECORD"
  | "UPDATE_DIAGNOSIS"
  | "UPDATE_EWS"
  | "ADMIT_PATIENT"
  | "DISCHARGE_PATIENT"
  | "DISPENSE_MEDICATION"
  | "TRANSFER_PATIENT"
  | "ADD_NOTE";

/**
 * One block in the audit blockchain.
 * Mirrors `core_engine::blockchain::block::Block`.
 */
export interface AuditBlock {
  index: number;
  /** Unix epoch seconds, as produced by `chrono::Utc::now().timestamp()`. */
  timestamp: number;
  patientId: string;
  action: AuditAction;
  doctorId: string;
  previousHash: string;
  hash: string;
}

/** Clinical acuity derived from an Early Warning Score. */
export type AcuityLevel = "stable" | "guarded" | "critical";

/** A single vital-signs observation feeding the Early Warning Score. */
export interface VitalSigns {
  heartRate: number; // bpm
  systolicBp: number; // mmHg
  respiratoryRate: number; // breaths/min
  temperature: number; // °C
  spo2: number; // %
  /** Aggregate Early Warning Score (NEWS-style, 0–20+). */
  ews: number;
  recordedAt: string; // ISO timestamp
}

/** An ICD-10 diagnosis attached to a patient. Mirrors `icd10_codes`. */
export interface Diagnosis {
  code: string; // e.g. "I10"
  description: string;
  diagnosedAt: string; // ISO date
}

/** A free-text clinical note on a patient's chart. */
export interface ClinicalNote {
  id: string;
  text: string;
  author: string; // doctor id
  createdAt: string; // ISO timestamp
}

/**
 * A patient record as surfaced to the portal (PII already decrypted upstream).
 * Mirrors the `patients` table plus the clinical context the portal renders.
 */
export interface Patient {
  id: string; // e.g. "PAT-123"
  name: string;
  /** Masked national ID — full value never leaves the core engine. */
  maskedSsn: string;
  age: number;
  sex: "male" | "female";
  ward: string;
  bed: string;
  admittedAt: string; // ISO date
  attendingDoctorId: string;
  acuity: AcuityLevel;
  vitals: VitalSigns;
  /** Chronological vitals observations (oldest → newest) for trend charts. */
  vitalsHistory: VitalSigns[];
  diagnoses: Diagnosis[];
  allergies: string[];
  /** Chart notes (newest appended last). */
  notes: ClinicalNote[];
  /** Set once a patient is discharged; absent while admitted. */
  dischargedAt?: string;
}

/** A medication line in the hospital formulary. Mirrors `formulary`. */
export interface FormularyItem {
  id: number;
  medicationName: string;
  dosage: string;
  stockQuantity: number;
  /** Reorder threshold used purely for UI low-stock signalling. */
  reorderLevel: number;
}

/** A billable procedure tariff in IDR. Mirrors `tariffs`. */
export interface Tariff {
  id: number;
  procedureCode: string; // e.g. "CON-01"
  procedureName: string;
  basePrice: number; // IDR
  category: "Consultation" | "Emergency" | "Laboratory" | "Procedure";
}

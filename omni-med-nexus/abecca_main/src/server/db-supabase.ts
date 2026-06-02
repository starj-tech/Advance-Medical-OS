/**
 * Supabase-backed implementation of the clinical datastore.
 *
 * Mirrors the in-memory store in db.ts one-to-one, so the public async API in
 * db.ts can delegate here whenever Supabase is configured. Tables and columns
 * follow core_engine/src/database/seeder.rs (snake_case); JSONB columns hold the
 * same camelCase shapes as the TS domain types, so no key rewriting is needed
 * inside the JSON. numeric/bigint values come back from PostgREST as strings and
 * are coerced here.
 *
 * The audit chain is lazily hydrated to exactly match the in-memory seed
 * (genesis + one ADMIT_PATIENT block per seeded patient) and uses the same
 * SHA-256 algorithm as server/audit.ts, so chains are identical across both
 * backends and verifiable against the Rust core engine.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AcuityLevel,
  AuditAction,
  AuditBlock,
  ClinicalNote,
  Diagnosis,
  FormularyItem,
  Patient,
  Tariff,
  VitalSigns,
} from "@/lib/types";
import { icd10, seedPatients } from "@/lib/data";
import { acuityFromEws, computeEws } from "@/lib/utils";
import { genesisBlock, isChainValid, makeBlock } from "./audit";

const ATTENDING = "DOC-456";

/* -------------------------------- row types ------------------------------- */

interface PatientRow {
  id: string;
  name: string;
  masked_ssn: string;
  age: number;
  sex: "male" | "female";
  ward: string;
  bed: string;
  admitted_at: string;
  attending_doctor_id: string;
  acuity: AcuityLevel;
  vitals: VitalSigns;
  vitals_history: VitalSigns[] | null;
  diagnoses: Diagnosis[] | null;
  allergies: string[] | null;
  notes: ClinicalNote[] | null;
  discharged_at: string | null;
}

interface FormularyRow {
  id: number;
  medication_name: string;
  dosage: string;
  stock_quantity: number;
  reorder_level: number;
}

interface TariffRow {
  id: number;
  procedure_code: string;
  procedure_name: string;
  base_price: string | number;
  category: Tariff["category"];
}

interface AuditRow {
  index: number;
  timestamp: number;
  patient_id: string;
  action: AuditAction;
  doctor_id: string;
  previous_hash: string;
  hash: string;
}

/* --------------------------------- mappers -------------------------------- */

function rowToPatient(r: PatientRow): Patient {
  return {
    id: r.id,
    name: r.name,
    maskedSsn: r.masked_ssn,
    age: r.age,
    sex: r.sex,
    ward: r.ward,
    bed: r.bed,
    admittedAt: r.admitted_at,
    attendingDoctorId: r.attending_doctor_id,
    acuity: r.acuity,
    vitals: r.vitals,
    vitalsHistory: r.vitals_history ?? [],
    diagnoses: r.diagnoses ?? [],
    allergies: r.allergies ?? [],
    notes: r.notes ?? [],
    dischargedAt: r.discharged_at ?? undefined,
  };
}

function patientToRow(p: Patient): PatientRow {
  return {
    id: p.id,
    name: p.name,
    masked_ssn: p.maskedSsn,
    age: p.age,
    sex: p.sex,
    ward: p.ward,
    bed: p.bed,
    admitted_at: p.admittedAt,
    attending_doctor_id: p.attendingDoctorId,
    acuity: p.acuity,
    vitals: p.vitals,
    vitals_history: p.vitalsHistory,
    diagnoses: p.diagnoses,
    allergies: p.allergies,
    notes: p.notes,
    discharged_at: p.dischargedAt ?? null,
  };
}

function rowToMed(r: FormularyRow): FormularyItem {
  return {
    id: r.id,
    medicationName: r.medication_name,
    dosage: r.dosage,
    stockQuantity: r.stock_quantity,
    reorderLevel: r.reorder_level,
  };
}

function rowToTariff(r: TariffRow): Tariff {
  return {
    id: r.id,
    procedureCode: r.procedure_code,
    procedureName: r.procedure_name,
    basePrice: Number(r.base_price),
    category: r.category,
  };
}

function rowToBlock(r: AuditRow): AuditBlock {
  return {
    index: Number(r.index),
    timestamp: Number(r.timestamp),
    patientId: r.patient_id,
    action: r.action,
    doctorId: r.doctor_id,
    previousHash: r.previous_hash,
    hash: r.hash,
  };
}

function blockToRow(b: AuditBlock): AuditRow {
  return {
    index: b.index,
    timestamp: b.timestamp,
    patient_id: b.patientId,
    action: b.action,
    doctor_id: b.doctorId,
    previous_hash: b.previousHash,
    hash: b.hash,
  };
}

/* ------------------------------ audit helpers ----------------------------- */

/**
 * Seed the on-disk chain once, idempotently, to match the in-memory build:
 * genesis + one ADMIT_PATIENT per seeded patient (same order, timestamps and
 * SHA-256 hashing). `ignoreDuplicates` makes concurrent first-writers safe.
 */
async function ensureAuditSeeded(sb: SupabaseClient): Promise<void> {
  const { count } = await sb
    .from("audit_blocks")
    .select("index", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;

  const chain: AuditBlock[] = [genesisBlock()];
  for (const p of seedPatients) {
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
  await sb
    .from("audit_blocks")
    .upsert(chain.map(blockToRow), { onConflict: "index", ignoreDuplicates: true });
}

async function appendBlock(
  sb: SupabaseClient,
  patientId: string,
  action: AuditAction,
  doctorId = ATTENDING,
  timestamp?: number,
): Promise<void> {
  await ensureAuditSeeded(sb);
  const { data } = await sb
    .from("audit_blocks")
    .select("*")
    .order("index", { ascending: false })
    .limit(1)
    .returns<AuditRow[]>();
  const prev = data && data.length ? rowToBlock(data[0]) : genesisBlock();
  const block = makeBlock(prev, patientId, action, doctorId, timestamp);
  await sb.from("audit_blocks").insert(blockToRow(block));
}

async function fetchPatient(
  sb: SupabaseClient,
  id: string,
): Promise<Patient | undefined> {
  const { data } = await sb
    .from("patients")
    .select("*")
    .eq("id", id)
    .maybeSingle<PatientRow>();
  return data ? rowToPatient(data) : undefined;
}

/* ---------------------------------- reads --------------------------------- */

export async function getPatients(sb: SupabaseClient): Promise<Patient[]> {
  const { data } = await sb
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .returns<PatientRow[]>();
  return (data ?? []).map(rowToPatient);
}

export async function getPatient(
  sb: SupabaseClient,
  id: string,
): Promise<Patient | undefined> {
  return fetchPatient(sb, id);
}

export async function getFormulary(sb: SupabaseClient): Promise<FormularyItem[]> {
  const { data } = await sb
    .from("formulary")
    .select("*")
    .order("id", { ascending: true })
    .returns<FormularyRow[]>();
  return (data ?? []).map(rowToMed);
}

export async function getTariffs(sb: SupabaseClient): Promise<Tariff[]> {
  const { data } = await sb
    .from("tariffs")
    .select("*")
    .order("id", { ascending: true })
    .returns<TariffRow[]>();
  return (data ?? []).map(rowToTariff);
}

export async function getIcd10(
  sb: SupabaseClient,
): Promise<Record<string, string>> {
  const { data } = await sb
    .from("icd10_codes")
    .select("code, description")
    .returns<{ code: string; description: string }[]>();
  if (!data || data.length === 0) return icd10; // fall back to bundled master
  return Object.fromEntries(data.map((r) => [r.code, r.description]));
}

export async function getAudit(
  sb: SupabaseClient,
): Promise<{ chain: AuditBlock[]; valid: boolean }> {
  await ensureAuditSeeded(sb);
  const { data } = await sb
    .from("audit_blocks")
    .select("*")
    .order("index", { ascending: true })
    .returns<AuditRow[]>();
  const chain = (data ?? []).map(rowToBlock);
  return { chain, valid: isChainValid(chain) };
}

/* -------------------------------- mutations ------------------------------- */

export type RawVitals = Omit<VitalSigns, "ews" | "recordedAt">;

export async function recordVitals(
  sb: SupabaseClient,
  id: string,
  raw: RawVitals,
): Promise<Patient | undefined> {
  const p = await fetchPatient(sb, id);
  if (!p) return undefined;
  const ews = computeEws(raw);
  const vitals: VitalSigns = { ...raw, ews, recordedAt: new Date().toISOString() };
  p.vitals = vitals;
  p.vitalsHistory = [...p.vitalsHistory, vitals];
  p.acuity = acuityFromEws(ews);
  await sb
    .from("patients")
    .update({
      vitals,
      vitals_history: p.vitalsHistory,
      acuity: p.acuity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  await appendBlock(sb, id, "UPDATE_EWS");
  return p;
}

export async function addDiagnosis(
  sb: SupabaseClient,
  id: string,
  code: string,
): Promise<Patient | undefined> {
  const p = await fetchPatient(sb, id);
  if (!p) return undefined;
  if (!p.diagnoses.some((d) => d.code === code)) {
    const diagnosis: Diagnosis = {
      code,
      description: icd10[code] ?? code,
      diagnosedAt: new Date().toISOString().slice(0, 10),
    };
    p.diagnoses = [...p.diagnoses, diagnosis];
    await sb
      .from("patients")
      .update({ diagnoses: p.diagnoses, updated_at: new Date().toISOString() })
      .eq("id", id);
    await appendBlock(sb, id, "UPDATE_DIAGNOSIS");
  }
  return p;
}

export async function addNote(
  sb: SupabaseClient,
  id: string,
  text: string,
): Promise<Patient | undefined> {
  const p = await fetchPatient(sb, id);
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
  await sb
    .from("patients")
    .update({ notes: p.notes, updated_at: new Date().toISOString() })
    .eq("id", id);
  await appendBlock(sb, id, "ADD_NOTE");
  return p;
}

export async function transferPatient(
  sb: SupabaseClient,
  id: string,
  ward: string,
  bed: string,
): Promise<Patient | undefined> {
  const p = await fetchPatient(sb, id);
  if (!p) return undefined;
  p.ward = ward;
  p.bed = bed;
  await sb
    .from("patients")
    .update({ ward, bed, updated_at: new Date().toISOString() })
    .eq("id", id);
  await appendBlock(sb, id, "TRANSFER_PATIENT");
  return p;
}

export async function dischargePatient(
  sb: SupabaseClient,
  id: string,
): Promise<Patient | undefined> {
  const p = await fetchPatient(sb, id);
  if (!p) return undefined;
  p.dischargedAt = new Date().toISOString().slice(0, 10);
  await sb
    .from("patients")
    .update({ discharged_at: p.dischargedAt, updated_at: new Date().toISOString() })
    .eq("id", id);
  await appendBlock(sb, id, "DISCHARGE_PATIENT");
  return p;
}

export async function dispenseToPatient(
  sb: SupabaseClient,
  id: string,
  medId: number,
  quantity: number,
): Promise<{ patient?: Patient; med?: FormularyItem }> {
  const { data: medRow } = await sb
    .from("formulary")
    .select("*")
    .eq("id", medId)
    .maybeSingle<FormularyRow>();
  let med: FormularyItem | undefined;
  if (medRow) {
    med = rowToMed(medRow);
    med.stockQuantity = Math.max(0, med.stockQuantity - quantity);
    await sb
      .from("formulary")
      .update({ stock_quantity: med.stockQuantity })
      .eq("id", medId);
  }
  const patient = await fetchPatient(sb, id);
  if (patient) await appendBlock(sb, id, "DISPENSE_MEDICATION");
  return { patient, med };
}

export async function restockMedication(
  sb: SupabaseClient,
  medId: number,
  quantity: number,
): Promise<FormularyItem | undefined> {
  const { data: medRow } = await sb
    .from("formulary")
    .select("*")
    .eq("id", medId)
    .maybeSingle<FormularyRow>();
  if (!medRow) return undefined;
  const med = rowToMed(medRow);
  med.stockQuantity += quantity;
  await sb
    .from("formulary")
    .update({ stock_quantity: med.stockQuantity })
    .eq("id", medId);
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

export async function admitPatient(
  sb: SupabaseClient,
  input: NewPatientInput,
): Promise<Patient> {
  const { data: ids } = await sb
    .from("patients")
    .select("id")
    .returns<{ id: string }[]>();
  const maxNum = (ids ?? []).reduce((m, row) => {
    const n = Number(row.id.replace(/\D/g, ""));
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
  await sb.from("patients").upsert(patientToRow(patient), { onConflict: "id" });
  await appendBlock(sb, id, "ADMIT_PATIENT");
  return patient;
}

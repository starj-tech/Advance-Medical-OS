/**
 * Minimal FHIR R4 resource builders for SATUSEHAT submission. Client-safe (pure).
 * These produce representative Encounter / Condition / Observation resources from
 * Abecca's encounter data. A production deployment maps to the full SATUSEHAT
 * implementation guide (IHS patient/practitioner references, KFA, LOINC, etc.).
 */
const SNOMED = "http://snomed.info/sct";
const ICD10 = "http://hl7.org/fhir/sid/icd-10";
const LOINC = "http://loinc.org";

export type FhirResource = { resourceType: string } & Record<string, unknown>;

const ENCOUNTER_CLASS: Record<string, { code: string; display: string }> = {
  outpatient: { code: "AMB", display: "ambulatory" },
  inpatient: { code: "IMP", display: "inpatient encounter" },
  ed: { code: "EMER", display: "emergency" },
  odc: { code: "AMB", display: "ambulatory" },
};

export function buildEncounter(input: {
  encounterId: string;
  type: string;
  status: string;
  patientRef: string;
  startedAt: string;
  endedAt?: string | null;
  orgId?: string;
}): FhirResource {
  const cls = ENCOUNTER_CLASS[input.type] ?? ENCOUNTER_CLASS.outpatient;
  const fhirStatus = input.status === "finished" ? "finished" : input.status === "cancelled" ? "cancelled" : "in-progress";
  return {
    resourceType: "Encounter",
    identifier: [{ system: "http://sys-ids.kemkes.go.id/encounter/abecca", value: input.encounterId }],
    status: fhirStatus,
    class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: cls.code, display: cls.display },
    subject: { reference: input.patientRef },
    period: { start: input.startedAt, ...(input.endedAt ? { end: input.endedAt } : {}) },
    ...(input.orgId ? { serviceProvider: { reference: `Organization/${input.orgId}` } } : {}),
  };
}

export function buildCondition(input: {
  code: string;
  display: string;
  patientRef: string;
  encounterRef: string;
}): FhirResource {
  return {
    resourceType: "Condition",
    clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-category", code: "encounter-diagnosis", display: "Encounter Diagnosis" }] }],
    code: { coding: [{ system: ICD10, code: input.code, display: input.display }] },
    subject: { reference: input.patientRef },
    encounter: { reference: input.encounterRef },
  };
}

export function buildVitalsObservation(input: {
  patientRef: string;
  encounterRef: string;
  loincCode: string;
  display: string;
  value: number;
  unit: string;
  effective: string;
}): FhirResource {
  return {
    resourceType: "Observation",
    status: "final",
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs", display: "Vital Signs" }] }],
    code: { coding: [{ system: LOINC, code: input.loincCode, display: input.display }] },
    subject: { reference: input.patientRef },
    encounter: { reference: input.encounterRef },
    effectiveDateTime: input.effective,
    valueQuantity: { value: input.value, unit: input.unit, system: "http://unitsofmeasure.org" },
  };
}

/** LOINC codes for the vital signs Abecca records (EWS observation set). */
export const VITAL_LOINC: { key: string; loincCode: string; display: string; unit: string }[] = [
  { key: "respiratoryRate", loincCode: "9279-1", display: "Respiratory rate", unit: "/min" },
  { key: "spo2", loincCode: "59408-5", display: "Oxygen saturation (pulse oximetry)", unit: "%" },
  { key: "temperature", loincCode: "8310-5", display: "Body temperature", unit: "Cel" },
  { key: "systolicBp", loincCode: "8480-6", display: "Systolic blood pressure", unit: "mm[Hg]" },
  { key: "pulse", loincCode: "8867-4", display: "Heart rate", unit: "/min" },
];

const MEDREQ_STATUS: Record<string, string> = {
  active: "active",
  held: "on-hold",
  stopped: "stopped",
};

/** e-Prescription line (CPOE order) → FHIR MedicationRequest. */
export function buildMedicationRequest(input: {
  patientRef: string;
  encounterRef: string;
  drugName: string;
  /** KFA (Kamus Farmasi & Alkes) code when the formulary carries one. */
  kfaCode?: string | null;
  dose?: string | null;
  route?: string | null;
  frequency?: string | null;
  status: string;
  authoredOn: string;
}): FhirResource {
  const dosageText = [input.dose, input.route, input.frequency].filter(Boolean).join(" · ");
  return {
    resourceType: "MedicationRequest",
    status: MEDREQ_STATUS[input.status] ?? "active",
    intent: "order",
    medicationCodeableConcept: {
      ...(input.kfaCode
        ? { coding: [{ system: KFA, code: input.kfaCode, display: input.drugName }] }
        : {}),
      text: input.drugName,
    },
    subject: { reference: input.patientRef },
    encounter: { reference: input.encounterRef },
    authoredOn: input.authoredOn,
    ...(dosageText ? { dosageInstruction: [{ text: dosageText }] } : {}),
  };
}

/** Resulted/verified lab or radiology order → FHIR DiagnosticReport. */
export function buildDiagnosticReport(input: {
  patientRef: string;
  encounterRef: string;
  category: "lab" | "radiology";
  testCode: string;
  testName: string;
  conclusion: string;
  effective: string;
  verified: boolean;
}): FhirResource {
  const cat =
    input.category === "lab"
      ? { code: "LAB", display: "Laboratory" }
      : { code: "RAD", display: "Radiology" };
  return {
    resourceType: "DiagnosticReport",
    status: input.verified ? "final" : "preliminary",
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v2-0074", ...cat }] }],
    code: {
      coding: [{ system: "http://sys-ids.kemkes.go.id/diagnostic/abecca", code: input.testCode, display: input.testName }],
      text: input.testName,
    },
    subject: { reference: input.patientRef },
    encounter: { reference: input.encounterRef },
    effectiveDateTime: input.effective,
    conclusion: input.conclusion,
  };
}

const KFA = "http://sys-ids.kemkes.go.id/kfa";

export { SNOMED, ICD10, LOINC, KFA };

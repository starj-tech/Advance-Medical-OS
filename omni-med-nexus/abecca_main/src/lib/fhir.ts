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

export { SNOMED, ICD10, LOINC };

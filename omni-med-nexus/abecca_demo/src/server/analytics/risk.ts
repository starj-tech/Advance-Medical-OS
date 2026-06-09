/**
 * Risk register — runs the predictive stratifier (lib/risk) over every active
 * encounter, joining each patient's prior-visit history and current comorbidity
 * burden into an explainable risk score. Tenant-scoped; composes existing
 * stores only (no new tables). Highest risk first — a prioritisation worklist.
 */
import {
  type Diagnosis,
  type EncounterType,
  listAllDiagnoses,
  listAllEncounters,
} from "../clinical/encounters";
import { listAllObservations } from "../clinical/observations";
import { isChronicCode, scoreEncounterRisk, type RiskResult } from "@/lib/risk";
import type { EwsBand } from "@/lib/ews";

export interface PatientRisk extends RiskResult {
  patientId: string;
  encounterId: string;
  encounterType: EncounterType;
  primaryDiagnosis: string | null;
  priorEncounters: number;
  latestEwsBand: EwsBand | null;
}

export interface RiskRegister {
  generatedAt: string;
  counts: { high: number; medium: number; low: number };
  patients: PatientRisk[];
}

export async function buildRiskRegister(companyId: string): Promise<RiskRegister> {
  const [encounters, diagnoses, observations] = await Promise.all([
    listAllEncounters(companyId),
    listAllDiagnoses(companyId),
    listAllObservations(companyId),
  ]);

  const dxByEncounter = new Map<string, Diagnosis[]>();
  for (const d of diagnoses) {
    const list = dxByEncounter.get(d.encounterId);
    if (list) list.push(d);
    else dxByEncounter.set(d.encounterId, [d]);
  }

  // Latest EWS band per encounter — observations arrive newest-first.
  const latestEws = new Map<string, EwsBand>();
  for (const o of observations) {
    if (!latestEws.has(o.encounterId)) latestEws.set(o.encounterId, o.ewsBand);
  }

  const active = encounters.filter((e) => e.status === "in_progress");
  const patients: PatientRisk[] = active.map((e) => {
    const prior = encounters.filter((x) => x.patientId === e.patientId && x.id !== e.id);
    const dxs = dxByEncounter.get(e.id) ?? [];
    const primary = dxs.find((d) => d.rank === "primary") ?? dxs[0];
    const ewsBand = latestEws.get(e.id) ?? null;
    const result = scoreEncounterRisk({
      priorEncounters: prior.length,
      edVisits: prior.filter((x) => x.type === "ed").length,
      diagnosisCount: dxs.length,
      chronicCount: dxs.filter((d) => isChronicCode(d.code)).length,
      currentType: e.type,
      ageYears: null,
      latestEwsBand: ewsBand,
    });
    return {
      ...result,
      patientId: e.patientId,
      encounterId: e.id,
      encounterType: e.type,
      primaryDiagnosis: primary?.description ?? null,
      priorEncounters: prior.length,
      latestEwsBand: ewsBand,
    };
  });

  patients.sort((a, b) => b.score - a.score);

  const counts = { high: 0, medium: 0, low: 0 };
  for (const p of patients) counts[p.band] += 1;

  return { generatedAt: new Date().toISOString(), counts, patients };
}

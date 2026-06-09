/**
 * Inpatient admission — places a patient into a free bed: opens an inpatient
 * encounter tied to the ward/bed, then marks the bed occupied with that patient
 * and encounter. Composes the encounter model and the bed board; tenant-scoped.
 */
import { createEncounter, type Encounter } from "../clinical/encounters";
import { listBeds, listWards, setBedStatus, type Bed } from "./beds";

export interface AdmitInput {
  patientId: string;
  bedId: string;
  dpjpUserId?: string | null;
}

export type AdmitResult =
  | { ok: true; encounter: Encounter; bed: Bed }
  | { ok: false; status: number; error: string };

export async function admitInpatient(companyId: string, input: AdmitInput): Promise<AdmitResult> {
  const beds = await listBeds(companyId);
  const bed = beds.find((b) => b.id === input.bedId);
  if (!bed) return { ok: false, status: 404, error: "Bed not found" };
  if (bed.status !== "available") return { ok: false, status: 409, error: "Bed is not available" };

  const wards = await listWards(companyId);
  const ward = wards.find((w) => w.id === bed.wardId);

  // Registration of the inpatient visit is the encounter; the bed records the occupant.
  const encounter = await createEncounter(companyId, {
    patientId: input.patientId,
    type: "inpatient",
    ward: ward?.name ?? null,
    bed: bed.label,
    dpjpUserId: input.dpjpUserId ?? null,
  });

  const updated = await setBedStatus(companyId, bed.id, "occupied", {
    patientId: input.patientId,
    encounterId: encounter.id,
  });

  return { ok: true, encounter, bed: updated ?? bed };
}

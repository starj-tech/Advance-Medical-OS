/**
 * Ward & bed master data + live occupancy (bed board / BOR). Tenant-scoped by
 * company_id; env-gated (Supabase tables ward_units/ward_beds, else in-memory).
 * Named ward_units/ward_beds to avoid the legacy non-tenant `wards` table.
 */
import { getSupabase } from "../supabase";

export type BedStatus = "available" | "occupied" | "cleaning" | "blocked";

export interface Ward {
  id: string;
  companyId: string;
  name: string;
  wardClass: string | null;
  createdAt: string;
}

export interface Bed {
  id: string;
  companyId: string;
  wardId: string;
  label: string;
  status: BedStatus;
  patientId: string | null;
  encounterId: string | null;
  updatedAt: string;
}

export interface BoardWard extends Ward {
  total: number;
  occupied: number;
  available: number;
  /** Bed Occupancy Rate, 0–100, one decimal. */
  bor: number;
  beds: Bed[];
}

const g = globalThis as unknown as { __abeccaFacility?: { wards: Ward[]; beds: Bed[] } };
const mem = g.__abeccaFacility ?? (g.__abeccaFacility = { wards: [], beds: [] });

type WardRow = { id: string; company_id: string; name: string; ward_class: string | null; created_at: string };
type BedRow = {
  id: string; company_id: string; ward_id: string; label: string; status: BedStatus;
  patient_id: string | null; encounter_id: string | null; updated_at: string;
};
const toWard = (r: WardRow): Ward => ({
  id: r.id, companyId: r.company_id, name: r.name, wardClass: r.ward_class, createdAt: r.created_at,
});
const toBed = (r: BedRow): Bed => ({
  id: r.id, companyId: r.company_id, wardId: r.ward_id, label: r.label, status: r.status,
  patientId: r.patient_id, encounterId: r.encounter_id, updatedAt: r.updated_at,
});

const BED_STATUSES: BedStatus[] = ["available", "occupied", "cleaning", "blocked"];
export const isBedStatus = (s: unknown): s is BedStatus =>
  typeof s === "string" && BED_STATUSES.includes(s as BedStatus);

/* ------------------------------- wards -------------------------------- */

export async function createWard(
  companyId: string,
  input: { name: string; wardClass?: string | null },
): Promise<Ward> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("ward_units")
      .insert({ company_id: companyId, name: input.name, ward_class: input.wardClass ?? null })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create ward failed");
    return toWard(data as WardRow);
  }
  const ward: Ward = {
    id: crypto.randomUUID(), companyId, name: input.name,
    wardClass: input.wardClass ?? null, createdAt: new Date().toISOString(),
  };
  mem.wards.push(ward);
  return ward;
}

export async function listWards(companyId: string): Promise<Ward[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("ward_units").select("*").eq("company_id", companyId).order("name");
    return (data ?? []).map((r) => toWard(r as WardRow));
  }
  return mem.wards.filter((w) => w.companyId === companyId).sort((a, b) => a.name.localeCompare(b.name));
}

/* -------------------------------- beds -------------------------------- */

export async function createBed(
  companyId: string,
  input: { wardId: string; label: string },
): Promise<Bed> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("ward_beds")
      .insert({ company_id: companyId, ward_id: input.wardId, label: input.label, status: "available" })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create bed failed");
    return toBed(data as BedRow);
  }
  const bed: Bed = {
    id: crypto.randomUUID(), companyId, wardId: input.wardId, label: input.label,
    status: "available", patientId: null, encounterId: null, updatedAt: new Date().toISOString(),
  };
  mem.beds.push(bed);
  return bed;
}

export async function listBeds(companyId: string): Promise<Bed[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("ward_beds").select("*").eq("company_id", companyId);
    return (data ?? []).map((r) => toBed(r as BedRow));
  }
  return mem.beds.filter((b) => b.companyId === companyId);
}

/** Set status and (de)assign occupant. Assigning sets occupied; releasing clears. */
export async function setBedStatus(
  companyId: string,
  bedId: string,
  status: BedStatus,
  occupant?: { patientId?: string | null; encounterId?: string | null },
): Promise<Bed | undefined> {
  const occupied = status === "occupied";
  const patientId = occupied ? occupant?.patientId ?? null : null;
  const encounterId = occupied ? occupant?.encounterId ?? null : null;
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("ward_beds")
      .update({ status, patient_id: patientId, encounter_id: encounterId, updated_at: new Date().toISOString() })
      .eq("company_id", companyId)
      .eq("id", bedId)
      .select("*")
      .maybeSingle();
    return data ? toBed(data as BedRow) : undefined;
  }
  const bed = mem.beds.find((b) => b.companyId === companyId && b.id === bedId);
  if (!bed) return undefined;
  bed.status = status;
  bed.patientId = patientId;
  bed.encounterId = encounterId;
  bed.updatedAt = new Date().toISOString();
  return bed;
}

/** Per-ward occupancy board with BOR. Beds in no ward are ignored. */
export async function boardSummary(companyId: string): Promise<BoardWard[]> {
  const [wards, beds] = await Promise.all([listWards(companyId), listBeds(companyId)]);
  return wards.map((w) => {
    const wardBeds = beds
      .filter((b) => b.wardId === w.id)
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    const total = wardBeds.length;
    const occupied = wardBeds.filter((b) => b.status === "occupied").length;
    const available = wardBeds.filter((b) => b.status === "available").length;
    const bor = total ? Math.round((occupied / total) * 1000) / 10 : 0;
    return { ...w, total, occupied, available, bor, beds: wardBeds };
  });
}

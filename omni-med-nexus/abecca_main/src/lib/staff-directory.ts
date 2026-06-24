/**
 * Staff directory model (Domain J) — client-safe & pure so the form, the list filter,
 * and the server agree. The directory lists all hospital personnel (not just system
 * login accounts), each with a profession, unit, contact, and employment status. The
 * search matcher is pure so the UI filter and any server-side filter behave identically.
 * No imports.
 */
export type StaffStatus = "active" | "on_leave" | "inactive";
export const STAFF_STATUSES: StaffStatus[] = ["active", "on_leave", "inactive"];
export const STAFF_STATUS_LABEL: Record<StaffStatus, string> = {
  active: "Aktif", on_leave: "Cuti", inactive: "Nonaktif",
};
export const STAFF_STATUS_VARIANT: Record<StaffStatus, "success" | "warning" | "muted"> = {
  active: "success", on_leave: "warning", inactive: "muted",
};

export type StaffProfession =
  | "doctor" | "nurse" | "midwife" | "pharmacist" | "pharmacy_tech"
  | "lab" | "radiographer" | "nutritionist" | "physiotherapist"
  | "admin" | "support" | "other";
export const STAFF_PROFESSIONS: StaffProfession[] = [
  "doctor", "nurse", "midwife", "pharmacist", "pharmacy_tech",
  "lab", "radiographer", "nutritionist", "physiotherapist", "admin", "support", "other",
];
export const STAFF_PROFESSION_LABEL: Record<StaffProfession, string> = {
  doctor: "Dokter", nurse: "Perawat", midwife: "Bidan", pharmacist: "Apoteker",
  pharmacy_tech: "TTK (Asisten Apoteker)", lab: "Analis Lab (ATLM)", radiographer: "Radiografer",
  nutritionist: "Nutrisionis", physiotherapist: "Fisioterapis", admin: "Administrasi",
  support: "Penunjang", other: "Lainnya",
};

/** Case-insensitive: does any of the given fields contain the (trimmed) query? Empty query matches all. */
export function staffMatchesQuery(query: string, fields: Array<string | null | undefined>): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  return fields.some((f) => (f ?? "").toLowerCase().includes(q));
}

export const isStaffStatus = (v: unknown): v is StaffStatus =>
  typeof v === "string" && (STAFF_STATUSES as string[]).includes(v);
export const isStaffProfession = (v: unknown): v is StaffProfession =>
  typeof v === "string" && (STAFF_PROFESSIONS as string[]).includes(v);

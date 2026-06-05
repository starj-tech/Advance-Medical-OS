/**
 * Outpatient clinic (poliklinik) catalogue — the specialties a visit can be
 * registered against. Client-safe (no imports) so the registration form and the
 * server validator share one list.
 */
export const POLYCLINICS = [
  "Umum",
  "Penyakit Dalam",
  "Anak",
  "Bedah",
  "Obstetri & Ginekologi",
  "Mata",
  "THT-KL",
  "Gigi & Mulut",
  "Saraf",
  "Kulit & Kelamin",
  "Jantung",
  "Paru",
  "Jiwa",
  "Ortopedi",
] as const;

export type Polyclinic = (typeof POLYCLINICS)[number];

export function isPolyclinic(v: unknown): v is Polyclinic {
  return typeof v === "string" && (POLYCLINICS as readonly string[]).includes(v);
}

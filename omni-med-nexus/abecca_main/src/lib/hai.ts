/**
 * Healthcare-associated infection (HAI) surveillance model — client-safe so the
 * recording forms and the server share the HAI types and the rate calculation.
 * Covers the four KARS/PPI core indicators; the headline metric is the incidence
 * density per 1000 device-days (cases ÷ device-days × 1000), the national standard.
 * Pure (no imports).
 */
export type HaiType = "VAP" | "IAD" | "ISK" | "IDO";

export const HAI_TYPES: HaiType[] = ["VAP", "IAD", "ISK", "IDO"];

export const HAI_TYPE_LABEL: Record<HaiType, string> = {
  VAP: "VAP — Ventilator-Associated Pneumonia",
  IAD: "IAD — Infeksi Aliran Darah (CLABSI)",
  ISK: "ISK — Infeksi Saluran Kemih (CAUTI)",
  IDO: "IDO — Infeksi Daerah Operasi (SSI)",
};

/** The denominator each rate is measured against. */
export const HAI_DENOMINATOR_LABEL: Record<HaiType, string> = {
  VAP: "hari-ventilator",
  IAD: "hari-kateter vena sentral",
  ISK: "hari-kateter urin",
  IDO: "prosedur operasi",
};

export const isHaiType = (v: unknown): v is HaiType =>
  typeof v === "string" && (HAI_TYPES as string[]).includes(v);

/**
 * Incidence density per 1000 device-days. Null when there is no exposure
 * denominator (a rate over zero device-days is undefined, not zero). Rounded to
 * two decimals.
 */
export function incidenceRate(cases: number, deviceDays: number): number | null {
  if (deviceDays <= 0) return null;
  return Math.round((cases / deviceDays) * 1000 * 100) / 100;
}

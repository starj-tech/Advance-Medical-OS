/**
 * Indikator Nasional Mutu (INM) — the 13 mandatory national quality indicators
 * every Indonesian hospital reports to Kemenkes (PMK 30/2022). Client-safe: the
 * catalogue (code, name, target %, and whether higher or lower is better) plus the
 * pure achievement/target math are shared by the entry form and the server so the
 * dashboard and any reporting agree. No imports.
 */
export type InmDirection = "higher" | "lower";

export interface InmIndicator {
  code: string;
  name: string;
  /** National target, in percent. */
  target: number;
  /** Whether a higher value is better (most) or lower is better (e.g. delays). */
  direction: InmDirection;
}

export const INM_INDICATORS: InmIndicator[] = [
  { code: "INM-01", name: "Kepatuhan kebersihan tangan", target: 85, direction: "higher" },
  { code: "INM-02", name: "Kepatuhan penggunaan APD", target: 100, direction: "higher" },
  { code: "INM-03", name: "Kepatuhan identifikasi pasien", target: 100, direction: "higher" },
  { code: "INM-04", name: "Waktu tanggap seksio sesarea emergensi ≤30 menit", target: 80, direction: "higher" },
  { code: "INM-05", name: "Waktu tunggu rawat jalan ≤60 menit", target: 80, direction: "higher" },
  { code: "INM-06", name: "Penundaan operasi elektif", target: 5, direction: "lower" },
  { code: "INM-07", name: "Kepatuhan waktu visite dokter", target: 80, direction: "higher" },
  { code: "INM-08", name: "Pelaporan hasil kritis laboratorium", target: 100, direction: "higher" },
  { code: "INM-09", name: "Kepatuhan penggunaan formularium nasional", target: 80, direction: "higher" },
  { code: "INM-10", name: "Kepatuhan terhadap clinical pathway", target: 80, direction: "higher" },
  { code: "INM-11", name: "Kepatuhan upaya pencegahan risiko jatuh", target: 100, direction: "higher" },
  { code: "INM-12", name: "Kecepatan waktu tanggap komplain", target: 80, direction: "higher" },
  { code: "INM-13", name: "Kepuasan pasien", target: 76.61, direction: "higher" },
];

const BY_CODE = new Map(INM_INDICATORS.map((i) => [i.code, i]));
export const getInmIndicator = (code: string): InmIndicator | undefined => BY_CODE.get(code);
export const isInmCode = (v: unknown): v is string => typeof v === "string" && BY_CODE.has(v);

/** Achievement percentage; null when there is no denominator (undefined, not 0%). */
export function achievementPct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 100 * 100) / 100;
}

/** Whether an achievement meets the national target, honouring the direction. */
export function meetsTarget(pct: number | null, target: number, direction: InmDirection): boolean | null {
  if (pct === null) return null;
  return direction === "higher" ? pct >= target : pct <= target;
}

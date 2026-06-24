/**
 * Seed catalogue of common chemotherapy regimens (illustrative — a hospital
 * maintains its own protocol list with its oncology committee). Client-safe so
 * the order form and the server share one source. Interval drives the
 * next-cycle due date computed by the chemo course store.
 */
export interface ChemoRegimen {
  code: string;
  name: string;
  indication: string;
  /** Planned number of cycles. */
  cycles: number;
  /** Days between cycles. */
  intervalDays: number;
}

export const CHEMO_REGIMENS: ChemoRegimen[] = [
  { code: "FOLFOX", name: "FOLFOX (oxaliplatin + 5-FU/leucovorin)", indication: "Kanker kolorektal", cycles: 12, intervalDays: 14 },
  { code: "FOLFIRI", name: "FOLFIRI (irinotecan + 5-FU/leucovorin)", indication: "Kanker kolorektal", cycles: 12, intervalDays: 14 },
  { code: "AC-T", name: "AC → T (doxorubicin/siklofosfamid → paclitaxel)", indication: "Kanker payudara", cycles: 8, intervalDays: 21 },
  { code: "RCHOP", name: "R-CHOP (rituximab + CHOP)", indication: "Limfoma non-Hodgkin", cycles: 6, intervalDays: 21 },
  { code: "CARBO-PACLI", name: "Carboplatin + Paclitaxel", indication: "Kanker paru / ovarium", cycles: 6, intervalDays: 21 },
  { code: "CISP-ETOP", name: "Cisplatin + Etoposide", indication: "Kanker paru (SCLC)", cycles: 6, intervalDays: 21 },
  { code: "GEM-CIS", name: "Gemcitabine + Cisplatin", indication: "Kanker kandung kemih / paru", cycles: 6, intervalDays: 21 },
];

export const findRegimen = (code: string): ChemoRegimen | undefined =>
  CHEMO_REGIMENS.find((r) => r.code === code);

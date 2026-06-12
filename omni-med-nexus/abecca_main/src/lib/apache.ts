/**
 * APACHE II severity-of-illness calculator (Knaus 1985) for ICU/HCU admission
 * assessment. Client-safe and pure so the form can preview the score live and
 * the server can persist the authoritative result from the same source.
 *
 * Simplification: oxygenation is graded from PaO2 alone (the FiO2 < 0.5 branch
 * of the original table); the A-a gradient branch for high FiO2 is not modelled.
 * The estimated mortality is the approximate non-operative group mean per score
 * band — an orientation aid, not a prognosis.
 */

export type ChronicHealth = "none" | "elective_postop" | "nonop_or_emergency_postop";

export interface ApacheInputs {
  /** Rectal temperature, °C. */
  temperatureC: number;
  /** Mean arterial pressure, mmHg. */
  meanArterialPressure: number;
  /** Heart rate, x/menit. */
  heartRate: number;
  /** Respiratory rate, x/menit. */
  respiratoryRate: number;
  /** PaO2, mmHg (assumes FiO2 < 0.5). */
  pao2: number;
  /** Arterial pH. */
  arterialPh: number;
  /** Serum sodium, mmol/L. */
  sodium: number;
  /** Serum potassium, mmol/L. */
  potassium: number;
  /** Serum creatinine, mg/dL. */
  creatinineMgDl: number;
  /** Points for creatinine are doubled in acute renal failure. */
  acuteRenalFailure?: boolean;
  /** Hematocrit, %. */
  hematocrit: number;
  /** Leukocytes, 10³/µL. */
  wbc: number;
  /** Glasgow Coma Scale, 3–15. */
  gcs: number;
  /** Age in years. */
  age: number;
  chronicHealth: ChronicHealth;
}

export interface ApacheResult {
  /** Total APACHE II score (0–71). */
  score: number;
  physiologicPoints: number;
  agePoints: number;
  chronicPoints: number;
  /** Approximate hospital mortality for the score band, in percent. */
  estimatedMortality: number;
}

const tempPts = (t: number) =>
  t >= 41 ? 4 : t >= 39 ? 3 : t >= 38.5 ? 1 : t >= 36 ? 0 : t >= 34 ? 1 : t >= 32 ? 2 : t >= 30 ? 3 : 4;
const mapPts = (m: number) =>
  m >= 160 ? 4 : m >= 130 ? 3 : m >= 110 ? 2 : m >= 70 ? 0 : m >= 50 ? 2 : 4;
const hrPts = (h: number) =>
  h >= 180 ? 4 : h >= 140 ? 3 : h >= 110 ? 2 : h >= 70 ? 0 : h >= 55 ? 2 : h >= 40 ? 3 : 4;
const rrPts = (r: number) =>
  r >= 50 ? 4 : r >= 35 ? 3 : r >= 25 ? 1 : r >= 12 ? 0 : r >= 10 ? 1 : r >= 6 ? 2 : 4;
const pao2Pts = (p: number) => (p > 70 ? 0 : p > 60 ? 1 : p >= 55 ? 3 : 4);
const phPts = (p: number) =>
  p >= 7.7 ? 4 : p >= 7.6 ? 3 : p >= 7.5 ? 1 : p >= 7.33 ? 0 : p >= 7.25 ? 2 : p >= 7.15 ? 3 : 4;
const naPts = (n: number) =>
  n >= 180 ? 4 : n >= 160 ? 3 : n >= 155 ? 2 : n >= 150 ? 1 : n >= 130 ? 0 : n >= 120 ? 2 : n >= 111 ? 3 : 4;
const kPts = (k: number) =>
  k >= 7 ? 4 : k >= 6 ? 3 : k >= 5.5 ? 1 : k >= 3.5 ? 0 : k >= 3 ? 1 : k >= 2.5 ? 2 : 4;
const creatPts = (c: number, arf: boolean) => {
  const base = c >= 3.5 ? 4 : c >= 2 ? 3 : c >= 1.5 ? 2 : c >= 0.6 ? 0 : 2;
  return arf ? base * 2 : base;
};
const hctPts = (h: number) =>
  h >= 60 ? 4 : h >= 50 ? 2 : h >= 46 ? 1 : h >= 30 ? 0 : h >= 20 ? 2 : 4;
const wbcPts = (w: number) =>
  w >= 40 ? 4 : w >= 20 ? 2 : w >= 15 ? 1 : w >= 3 ? 0 : w >= 1 ? 2 : 4;

const agePts = (a: number) => (a >= 75 ? 6 : a >= 65 ? 5 : a >= 55 ? 3 : a >= 45 ? 2 : 0);
const chronicPts = (c: ChronicHealth) =>
  c === "nonop_or_emergency_postop" ? 5 : c === "elective_postop" ? 2 : 0;

/** Approximate non-operative hospital mortality per score band (percent). */
export function apacheMortality(score: number): number {
  if (score <= 4) return 4;
  if (score <= 9) return 8;
  if (score <= 14) return 15;
  if (score <= 19) return 25;
  if (score <= 24) return 40;
  if (score <= 29) return 55;
  if (score <= 34) return 73;
  return 85;
}

export function computeApache(inputs: ApacheInputs): ApacheResult {
  const gcs = Math.min(15, Math.max(3, inputs.gcs));
  const physiologicPoints =
    tempPts(inputs.temperatureC) +
    mapPts(inputs.meanArterialPressure) +
    hrPts(inputs.heartRate) +
    rrPts(inputs.respiratoryRate) +
    pao2Pts(inputs.pao2) +
    phPts(inputs.arterialPh) +
    naPts(inputs.sodium) +
    kPts(inputs.potassium) +
    creatPts(inputs.creatinineMgDl, inputs.acuteRenalFailure ?? false) +
    hctPts(inputs.hematocrit) +
    wbcPts(inputs.wbc) +
    (15 - gcs);
  const agePoints = agePts(inputs.age);
  const chronicPoints = chronicPts(inputs.chronicHealth);
  const score = physiologicPoints + agePoints + chronicPoints;
  return {
    score,
    physiologicPoints,
    agePoints,
    chronicPoints,
    estimatedMortality: apacheMortality(score),
  };
}

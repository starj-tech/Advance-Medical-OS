/**
 * Nursing risk-assessment scales (Domain E) — client-safe & pure. Two bedside scales that
 * underpin the KARS patient-safety goals: the Morse Fall Scale (risiko jatuh) and the Braden
 * Scale (risiko dekubitus/luka tekan). Scoring is deterministic and documented here so the
 * calculator preview, the server, and the tests all agree on one source of truth. The two
 * scales run in opposite directions — a HIGH Morse score is bad, a LOW Braden score is bad —
 * so each has its own banding. No state, no I/O.
 */

export type ScaleKind = "morse" | "braden";
export const SCALE_LABEL: Record<ScaleKind, string> = {
  morse: "Risiko Jatuh (Morse)",
  braden: "Risiko Dekubitus (Braden)",
};

// ── Morse Fall Scale ──────────────────────────────────────────────────────────
export interface MorseInput {
  historyOfFalling: boolean;                       // riwayat jatuh: 0 / 25
  secondaryDiagnosis: boolean;                     // diagnosis sekunder ≥2: 0 / 15
  ambulatoryAid: "none" | "crutches" | "furniture"; // alat bantu: 0 / 15 / 30
  ivTherapy: boolean;                              // terpasang infus/heparin lock: 0 / 20
  gait: "normal" | "weak" | "impaired";            // gaya berjalan: 0 / 10 / 20
  mentalStatus: "oriented" | "forgets";            // status mental: 0 / 15
}
export type MorseRisk = "low" | "medium" | "high";

const AMBULATORY_POINTS: Record<MorseInput["ambulatoryAid"], number> = { none: 0, crutches: 15, furniture: 30 };
const GAIT_POINTS: Record<MorseInput["gait"], number> = { normal: 0, weak: 10, impaired: 20 };

/** Morse total (0–125). */
export function morseScore(i: MorseInput): number {
  return (
    (i.historyOfFalling ? 25 : 0) +
    (i.secondaryDiagnosis ? 15 : 0) +
    AMBULATORY_POINTS[i.ambulatoryAid] +
    (i.ivTherapy ? 20 : 0) +
    GAIT_POINTS[i.gait] +
    (i.mentalStatus === "forgets" ? 15 : 0)
  );
}
/** Morse band — higher score = higher fall risk. */
export function morseRisk(score: number): MorseRisk {
  if (score >= 45) return "high";
  if (score >= 25) return "medium";
  return "low";
}
export const MORSE_RISK_LABEL: Record<MorseRisk, string> = {
  low: "Risiko rendah", medium: "Risiko sedang", high: "Risiko tinggi",
};
export const MORSE_RISK_VARIANT: Record<MorseRisk, "success" | "warning" | "danger"> = {
  low: "success", medium: "warning", high: "danger",
};

// ── Braden Scale ──────────────────────────────────────────────────────────────
export interface BradenInput {
  sensoryPerception: 1 | 2 | 3 | 4;
  moisture: 1 | 2 | 3 | 4;
  activity: 1 | 2 | 3 | 4;
  mobility: 1 | 2 | 3 | 4;
  nutrition: 1 | 2 | 3 | 4;
  frictionShear: 1 | 2 | 3;
}
export type BradenRisk = "none" | "mild" | "moderate" | "high" | "very_high";

/** Braden total (6–23). */
export function bradenScore(i: BradenInput): number {
  return i.sensoryPerception + i.moisture + i.activity + i.mobility + i.nutrition + i.frictionShear;
}
/** Braden band — LOWER score = higher pressure-injury risk. */
export function bradenRisk(score: number): BradenRisk {
  if (score <= 9) return "very_high";
  if (score <= 12) return "high";
  if (score <= 14) return "moderate";
  if (score <= 18) return "mild";
  return "none";
}
export const BRADEN_RISK_LABEL: Record<BradenRisk, string> = {
  none: "Tanpa risiko", mild: "Risiko ringan", moderate: "Risiko sedang",
  high: "Risiko tinggi", very_high: "Risiko sangat tinggi",
};
export const BRADEN_RISK_VARIANT: Record<BradenRisk, "success" | "info" | "warning" | "danger"> = {
  none: "success", mild: "info", moderate: "warning", high: "danger", very_high: "danger",
};

// ── Validation / coercion of untrusted input (API boundary) ─────────────────────
function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function asBool(v: unknown): boolean {
  return v === true;
}
function asInt(v: unknown, lo: number, hi: number): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null;
}

/** Coerce untrusted JSON into a MorseInput, or null if invalid. */
export function coerceMorseInput(raw: unknown): MorseInput | null {
  if (!isObj(raw)) return null;
  const aid = raw.ambulatoryAid;
  const gait = raw.gait;
  const mental = raw.mentalStatus;
  if (aid !== "none" && aid !== "crutches" && aid !== "furniture") return null;
  if (gait !== "normal" && gait !== "weak" && gait !== "impaired") return null;
  if (mental !== "oriented" && mental !== "forgets") return null;
  return {
    historyOfFalling: asBool(raw.historyOfFalling),
    secondaryDiagnosis: asBool(raw.secondaryDiagnosis),
    ambulatoryAid: aid,
    ivTherapy: asBool(raw.ivTherapy),
    gait,
    mentalStatus: mental,
  };
}

/** Coerce untrusted JSON into a BradenInput, or null if any subscale is out of range. */
export function coerceBradenInput(raw: unknown): BradenInput | null {
  if (!isObj(raw)) return null;
  const sp = asInt(raw.sensoryPerception, 1, 4);
  const mo = asInt(raw.moisture, 1, 4);
  const ac = asInt(raw.activity, 1, 4);
  const mob = asInt(raw.mobility, 1, 4);
  const nu = asInt(raw.nutrition, 1, 4);
  const fs = asInt(raw.frictionShear, 1, 3);
  if (sp === null || mo === null || ac === null || mob === null || nu === null || fs === null) return null;
  return {
    sensoryPerception: sp as BradenInput["sensoryPerception"],
    moisture: mo as BradenInput["moisture"],
    activity: ac as BradenInput["activity"],
    mobility: mob as BradenInput["mobility"],
    nutrition: nu as BradenInput["nutrition"],
    frictionShear: fs as BradenInput["frictionShear"],
  };
}

/** Unified scoring used by the server: validate + score + band for either scale. */
export function scoreAssessment(
  scale: ScaleKind,
  rawItems: unknown,
): { score: number; band: string; items: MorseInput | BradenInput } | null {
  if (scale === "morse") {
    const items = coerceMorseInput(rawItems);
    if (!items) return null;
    const score = morseScore(items);
    return { score, band: morseRisk(score), items };
  }
  const items = coerceBradenInput(rawItems);
  if (!items) return null;
  const score = bradenScore(items);
  return { score, band: bradenRisk(score), items };
}

/** Whether a band string denotes high (escalation-worthy) risk on either scale. */
export function isHighRisk(scale: ScaleKind, band: string): boolean {
  return scale === "morse" ? band === "high" : band === "high" || band === "very_high";
}

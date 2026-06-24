/**
 * Glasgow Coma Scale (Domain A/E) — client-safe & pure. The bedside neuro score is the sum of
 * three responses — Eye (1–4), Verbal (1–5), Motor (1–6) — giving 3–15, banded into mild,
 * moderate, and severe impairment. Deterministic scoring shared by the calculator preview, the
 * server, and the tests. No state, no I/O.
 */
export interface GcsInput {
  eye: 1 | 2 | 3 | 4;
  verbal: 1 | 2 | 3 | 4 | 5;
  motor: 1 | 2 | 3 | 4 | 5 | 6;
}
export type GcsSeverity = "mild" | "moderate" | "severe";

/** GCS total (3–15). */
export function gcsScore(i: GcsInput): number {
  return i.eye + i.verbal + i.motor;
}
/** Band by total — lower score = deeper impairment (severe ≤8, moderate 9–12, mild 13–15). */
export function gcsSeverity(score: number): GcsSeverity {
  if (score <= 8) return "severe";
  if (score <= 12) return "moderate";
  return "mild";
}
export const GCS_SEVERITY_LABEL: Record<GcsSeverity, string> = {
  mild: "Ringan", moderate: "Sedang", severe: "Berat",
};
export const GCS_SEVERITY_VARIANT: Record<GcsSeverity, "success" | "warning" | "danger"> = {
  mild: "success", moderate: "warning", severe: "danger",
};

// Subscale option descriptors (point = array index; index 0 unused).
export const GCS_EYE = ["", "Tidak ada (1)", "Terhadap nyeri (2)", "Terhadap suara (3)", "Spontan (4)"];
export const GCS_VERBAL = ["", "Tidak ada (1)", "Suara tak jelas (2)", "Kata tak sesuai (3)", "Bingung (4)", "Orientasi baik (5)"];
export const GCS_MOTOR = ["", "Tidak ada (1)", "Ekstensi abnormal (2)", "Fleksi abnormal (3)", "Menghindar nyeri (4)", "Melokalisir nyeri (5)", "Mengikuti perintah (6)"];

function asInt(v: unknown, lo: number, hi: number): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null;
}

/** Coerce untrusted JSON into a GcsInput, or null if any component is out of range. */
export function coerceGcsInput(raw: unknown): GcsInput | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const eye = asInt(r.eye, 1, 4);
  const verbal = asInt(r.verbal, 1, 5);
  const motor = asInt(r.motor, 1, 6);
  if (eye === null || verbal === null || motor === null) return null;
  return { eye: eye as GcsInput["eye"], verbal: verbal as GcsInput["verbal"], motor: motor as GcsInput["motor"] };
}

/** GCS shorthand, e.g. "E4V5M6". */
export function gcsNotation(i: GcsInput): string {
  return `E${i.eye}V${i.verbal}M${i.motor}`;
}

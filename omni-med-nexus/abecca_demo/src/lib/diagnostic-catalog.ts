/**
 * Seed catalogue of orderable diagnostics (lab + radiology). Client-safe so the
 * order form and the server can share it. A hospital extends this from its LIS/
 * RIS master; codes loosely follow common Indonesian-market naming. Lab tests
 * carry an optional specimen type and reference/critical ranges so results can
 * be flagged (normal / abnormal / critical "panic value").
 */
export type DiagnosticCategory = "lab" | "radiology";

export type ResultFlag = "normal" | "abnormal" | "critical" | "unknown";

/** Imaging modality — drives the RIS modality worklist (DICOM MWL concept). */
export type Modality = "X-Ray" | "CT" | "MRI" | "USG" | "Fluoroskopi" | "Mammografi";

export const MODALITIES: Modality[] = [
  "X-Ray", "CT", "MRI", "USG", "Fluoroskopi", "Mammografi",
];

export interface DiagnosticTest {
  code: string;
  name: string;
  category: DiagnosticCategory;
  /** Optional unit/reference hint shown to the resulting staff. */
  unit?: string;
  /** Specimen required (lab). */
  specimen?: string;
  /** Reference range (numeric). Outside → abnormal. */
  refLow?: number;
  refHigh?: number;
  /** Critical thresholds (panic values). At/beyond → critical. */
  critLow?: number;
  critHigh?: number;
  /** Imaging modality (radiology) — groups studies into modality worklists. */
  modality?: Modality;
}

export const DIAGNOSTIC_CATALOG: DiagnosticTest[] = [
  // Laboratory — panels (no single numeric value to grade)
  { code: "DPL", name: "Darah Perifer Lengkap", category: "lab", unit: "—", specimen: "Darah EDTA" },
  { code: "URIN", name: "Urinalisis Lengkap", category: "lab", unit: "—", specimen: "Urin" },
  { code: "ELEK", name: "Elektrolit (Na/K/Cl)", category: "lab", unit: "mmol/L", specimen: "Serum" },
  // Laboratory — single analytes with ranges
  { code: "GDS", name: "Gula Darah Sewaktu", category: "lab", unit: "mg/dL", specimen: "Serum", refLow: 70, refHigh: 140, critLow: 50, critHigh: 400 },
  { code: "GDP", name: "Gula Darah Puasa", category: "lab", unit: "mg/dL", specimen: "Serum", refLow: 70, refHigh: 110, critLow: 50, critHigh: 400 },
  { code: "HBA1C", name: "HbA1c", category: "lab", unit: "%", specimen: "Darah EDTA", refLow: 4, refHigh: 6.5 },
  { code: "UREUM", name: "Ureum", category: "lab", unit: "mg/dL", specimen: "Serum", refLow: 15, refHigh: 40, critHigh: 200 },
  { code: "KREAT", name: "Kreatinin", category: "lab", unit: "mg/dL", specimen: "Serum", refLow: 0.6, refHigh: 1.3, critHigh: 6 },
  { code: "SGOT", name: "SGOT/AST", category: "lab", unit: "U/L", specimen: "Serum", refLow: 5, refHigh: 40 },
  { code: "SGPT", name: "SGPT/ALT", category: "lab", unit: "U/L", specimen: "Serum", refLow: 5, refHigh: 41 },
  { code: "CRP", name: "C-Reactive Protein", category: "lab", unit: "mg/L", specimen: "Serum", refLow: 0, refHigh: 5 },
  { code: "KALIUM", name: "Kalium (K)", category: "lab", unit: "mmol/L", specimen: "Serum", refLow: 3.5, refHigh: 5.1, critLow: 2.5, critHigh: 6.5 },
  { code: "NATRIUM", name: "Natrium (Na)", category: "lab", unit: "mmol/L", specimen: "Serum", refLow: 135, refHigh: 145, critLow: 120, critHigh: 160 },
  { code: "HB", name: "Hemoglobin", category: "lab", unit: "g/dL", specimen: "Darah EDTA", refLow: 12, refHigh: 16, critLow: 7, critHigh: 20 },
  { code: "LEUKO", name: "Leukosit", category: "lab", unit: "10³/µL", specimen: "Darah EDTA", refLow: 4, refHigh: 11, critLow: 1, critHigh: 30 },
  { code: "TROMB", name: "Trombosit", category: "lab", unit: "10³/µL", specimen: "Darah EDTA", refLow: 150, refHigh: 400, critLow: 50, critHigh: 1000 },
  // Radiology — each carries a modality so the RIS can build per-modality worklists.
  { code: "XRTHX", name: "Rontgen Thorax PA", category: "radiology", modality: "X-Ray" },
  { code: "XRABD", name: "Rontgen Abdomen 3 Posisi", category: "radiology", modality: "X-Ray" },
  { code: "XRBNO", name: "Rontgen BNO-IVP", category: "radiology", modality: "X-Ray" },
  { code: "USGABD", name: "USG Abdomen", category: "radiology", modality: "USG" },
  { code: "USGOBS", name: "USG Obstetri", category: "radiology", modality: "USG" },
  { code: "CTHEAD", name: "CT Scan Kepala", category: "radiology", modality: "CT" },
  { code: "CTTHX", name: "CT Scan Thorax", category: "radiology", modality: "CT" },
  { code: "MRIHEAD", name: "MRI Kepala", category: "radiology", modality: "MRI" },
  { code: "MRILUMBAL", name: "MRI Lumbal", category: "radiology", modality: "MRI" },
  { code: "MAMMO", name: "Mammografi", category: "radiology", modality: "Mammografi" },
];

export const findTest = (code: string): DiagnosticTest | undefined =>
  DIAGNOSTIC_CATALOG.find((t) => t.code === code);

/**
 * Grade a result value against the test's reference/critical ranges.
 * Returns "unknown" when the value isn't numeric or the test has no ranges
 * (e.g. panels / radiology), so the caller never fabricates a flag.
 */
export function evaluateResult(
  test: DiagnosticTest | undefined,
  raw: string,
): ResultFlag {
  if (!test) return "unknown";
  const n = Number.parseFloat(String(raw).replace(",", ".").replace(/[^0-9.+-]/g, ""));
  if (!Number.isFinite(n)) return "unknown";
  const { refLow, refHigh, critLow, critHigh } = test;
  if (critLow != null && n <= critLow) return "critical";
  if (critHigh != null && n >= critHigh) return "critical";
  if (refLow == null && refHigh == null) return "unknown";
  if (refLow != null && n < refLow) return "abnormal";
  if (refHigh != null && n > refHigh) return "abnormal";
  return "normal";
}

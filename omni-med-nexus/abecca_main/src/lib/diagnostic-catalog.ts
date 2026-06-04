/**
 * Seed catalogue of orderable diagnostics (lab + radiology). Client-safe so the
 * order form and the server can share it. A hospital extends this from its LIS/
 * RIS master; codes loosely follow common Indonesian-market naming.
 */
export type DiagnosticCategory = "lab" | "radiology";

export interface DiagnosticTest {
  code: string;
  name: string;
  category: DiagnosticCategory;
  /** Optional unit/reference hint shown to the resulting staff. */
  unit?: string;
}

export const DIAGNOSTIC_CATALOG: DiagnosticTest[] = [
  // Laboratory
  { code: "DPL", name: "Darah Perifer Lengkap", category: "lab", unit: "—" },
  { code: "GDS", name: "Gula Darah Sewaktu", category: "lab", unit: "mg/dL" },
  { code: "GDP", name: "Gula Darah Puasa", category: "lab", unit: "mg/dL" },
  { code: "HBA1C", name: "HbA1c", category: "lab", unit: "%" },
  { code: "UREUM", name: "Ureum", category: "lab", unit: "mg/dL" },
  { code: "KREAT", name: "Kreatinin", category: "lab", unit: "mg/dL" },
  { code: "SGOT", name: "SGOT/AST", category: "lab", unit: "U/L" },
  { code: "SGPT", name: "SGPT/ALT", category: "lab", unit: "U/L" },
  { code: "ELEK", name: "Elektrolit (Na/K/Cl)", category: "lab", unit: "mmol/L" },
  { code: "CRP", name: "C-Reactive Protein", category: "lab", unit: "mg/L" },
  { code: "URIN", name: "Urinalisis Lengkap", category: "lab", unit: "—" },
  // Radiology
  { code: "XRTHX", name: "Rontgen Thorax PA", category: "radiology" },
  { code: "XRABD", name: "Rontgen Abdomen 3 Posisi", category: "radiology" },
  { code: "USGABD", name: "USG Abdomen", category: "radiology" },
  { code: "CTHEAD", name: "CT Scan Kepala", category: "radiology" },
  { code: "CTTHX", name: "CT Scan Thorax", category: "radiology" },
  { code: "MRIHEAD", name: "MRI Kepala", category: "radiology" },
];

export const findTest = (code: string): DiagnosticTest | undefined =>
  DIAGNOSTIC_CATALOG.find((t) => t.code === code);

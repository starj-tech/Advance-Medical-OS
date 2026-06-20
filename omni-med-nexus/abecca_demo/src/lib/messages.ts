/**
 * UI message catalogues. The `Messages` interface makes locale parity compile-enforced
 * (a missing key fails `tsc`); a runtime parity test guards against `as any` drift.
 * This slice localises the navigation + app-shell chrome end-to-end as the
 * representative surface; remaining strings migrate to keys in follow-up slices.
 */
import type { Locale } from "./i18n";

export interface Messages {
  nav: {
    dashboard: string; analytics: string; copilot: string; registration: string;
    emergency: string; appointments: string; telemedicine: string; patients: string;
    beds: string; surgery: string; diagnostics: string; imaging: string;
    specialCare: string; forms: string; devices: string; formulary: string;
    pharmacy: string; inventory: string; procurement: string; stockTake: string; tariffs: string;
    payers: string; safety: string; riskRegister: string; consent: string; complaints: string; feedback: string; infectionControl: string;
    antimicrobial: string; qualityIndicators: string; credentials: string; staffDirectory: string; audit: string;
    observability: string; integrations: string; security: string;
  };
  shell: {
    clinical: string;
    coreEngine: string;
    searchPlaceholder: string;
    openMenu: string;
    closeMenu: string;
    brandTagline: string;
    patientRecord: string;
    language: string;
  };
}

const id: Messages = {
  nav: {
    dashboard: "Dashboard", analytics: "Analitik", copilot: "Copilot",
    registration: "Pendaftaran", emergency: "IGD", appointments: "Janji Temu",
    telemedicine: "Telemedicine", patients: "Pasien", beds: "Papan Bed",
    surgery: "Operasi", diagnostics: "Lab & Radiologi", imaging: "Imaging / PACS",
    specialCare: "Unit Khusus", forms: "Form Dinamis", devices: "Perangkat",
    formulary: "Formularium", pharmacy: "Farmasi", inventory: "Inventory",
    procurement: "Pengadaan", stockTake: "Stok Opname", tariffs: "Tarif", payers: "Penjamin", safety: "Keselamatan",
    riskRegister: "Manajemen Risiko", consent: "Persetujuan", complaints: "Komplain", feedback: "Umpan Balik", infectionControl: "PPI / Infeksi",
    antimicrobial: "Stewardship Antimikroba", qualityIndicators: "Indikator Mutu", credentials: "Kredensial Nakes", staffDirectory: "Direktori Staf",
    audit: "Audit Trail", observability: "Observability",
    integrations: "Integrasi", security: "Keamanan Akun",
  },
  shell: {
    clinical: "Klinis",
    coreEngine: "Core engine: mode library",
    searchPlaceholder: "Cari pasien, kode…",
    openMenu: "Buka menu",
    closeMenu: "Tutup menu",
    brandTagline: "Portal Klinis",
    patientRecord: "Rekam Pasien",
    language: "Bahasa",
  },
};

const en: Messages = {
  nav: {
    dashboard: "Dashboard", analytics: "Analytics", copilot: "Copilot",
    registration: "Registration", emergency: "Emergency", appointments: "Appointments",
    telemedicine: "Telemedicine", patients: "Patients", beds: "Bed Board",
    surgery: "Surgery", diagnostics: "Lab & Radiology", imaging: "Imaging / PACS",
    specialCare: "Special Care", forms: "Dynamic Forms", devices: "Devices",
    formulary: "Formulary", pharmacy: "Pharmacy", inventory: "Inventory",
    procurement: "Procurement", stockTake: "Stock-Take", tariffs: "Tariffs", payers: "Payers", safety: "Patient Safety",
    riskRegister: "Risk Management", consent: "Consent", complaints: "Complaints", feedback: "Feedback", infectionControl: "IPC / Infection",
    antimicrobial: "Antimicrobial Stewardship", qualityIndicators: "Quality Indicators", credentials: "Staff Credentials", staffDirectory: "Staff Directory",
    audit: "Audit Trail", observability: "Observability",
    integrations: "Integrations", security: "Account Security",
  },
  shell: {
    clinical: "Clinical",
    coreEngine: "Core engine: library mode",
    searchPlaceholder: "Search patients, codes…",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    brandTagline: "Clinical Portal",
    patientRecord: "Patient Record",
    language: "Language",
  },
};

export const MESSAGES: Record<Locale, Messages> = { id, en };

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}

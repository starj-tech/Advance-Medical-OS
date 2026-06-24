/**
 * Representative data for the Admin portal. Tariffs and formulary rows are
 * taken verbatim from core_engine/src/database/seeder.rs; wards, staff and
 * invoices are the operational layer admins manage on top of the clinical core.
 * Accessors are async so a real core-engine API can replace the bodies later.
 */

import type {
  Invoice,
  FormularyItem,
  Staff,
  Tariff,
  Ward,
} from "./types";

const wards: Ward[] = [
  { id: "W-ICU", name: "Intensive Care", department: "Critical Care", totalBeds: 12, occupiedBeds: 11 },
  { id: "W-CARD", name: "Cardiology", department: "Cardiology", totalBeds: 24, occupiedBeds: 18 },
  { id: "W-PUL", name: "Pulmonology", department: "Respiratory", totalBeds: 20, occupiedBeds: 13 },
  { id: "W-GEN", name: "General Ward", department: "Internal Medicine", totalBeds: 40, occupiedBeds: 26 },
  { id: "W-ER", name: "Emergency", department: "Emergency", totalBeds: 16, occupiedBeds: 15 },
];

const staff: Staff[] = [
  { id: "DOC-456", name: "Dr Sarah Halim", role: "Physician", department: "Critical Care", shift: "Morning", onDuty: true },
  { id: "DOC-781", name: "Dr Rian Pratama", role: "Physician", department: "Internal Medicine", shift: "Morning", onDuty: true },
  { id: "NUR-201", name: "Maya Putri", role: "Nurse", department: "Cardiology", shift: "Morning", onDuty: true },
  { id: "NUR-202", name: "Joko Susilo", role: "Nurse", department: "Emergency", shift: "Evening", onDuty: false },
  { id: "PHA-011", name: "Lina Wijaya", role: "Pharmacist", department: "Pharmacy", shift: "Morning", onDuty: true },
  { id: "TEC-033", name: "Agus Setiawan", role: "Technician", department: "Laboratory", shift: "Night", onDuty: false },
];

const formulary: FormularyItem[] = [
  { id: 1, medicationName: "Paracetamol", dosage: "500mg", stockQuantity: 10000, reorderLevel: 2000 },
  { id: 2, medicationName: "Amoxicillin", dosage: "250mg", stockQuantity: 5000, reorderLevel: 2000 },
  { id: 3, medicationName: "Metformin", dosage: "500mg", stockQuantity: 8000, reorderLevel: 2000 },
  { id: 4, medicationName: "Insulin Glargine", dosage: "100IU/mL", stockQuantity: 1450, reorderLevel: 1500 },
  { id: 5, medicationName: "Furosemide", dosage: "40mg", stockQuantity: 620, reorderLevel: 1000 },
];

const tariffs: Tariff[] = [
  { id: 1, procedureCode: "CON-01", procedureName: "General Practitioner Consultation", basePrice: 150000, category: "Consultation" },
  { id: 2, procedureCode: "CON-02", procedureName: "Specialist Consultation", basePrice: 350000, category: "Consultation" },
  { id: 3, procedureCode: "ER-01", procedureName: "Emergency Room Basic Admission", basePrice: 500000, category: "Emergency" },
  { id: 4, procedureCode: "LAB-01", procedureName: "Complete Blood Count (CBC)", basePrice: 85000, category: "Laboratory" },
];

const invoices: Invoice[] = [
  {
    id: "INV-2041",
    patientId: "PAT-123",
    patientName: "Andi Wijaya",
    issuedAt: "2026-05-29",
    status: "pending",
    lines: [
      { procedureCode: "ER-01", procedureName: "Emergency Room Basic Admission", amount: 500000 },
      { procedureCode: "CON-02", procedureName: "Specialist Consultation", amount: 350000 },
      { procedureCode: "LAB-01", procedureName: "Complete Blood Count (CBC)", amount: 85000 },
    ],
  },
  {
    id: "INV-2042",
    patientId: "PAT-204",
    patientName: "Siti Rahmawati",
    issuedAt: "2026-05-28",
    status: "paid",
    lines: [
      { procedureCode: "CON-02", procedureName: "Specialist Consultation", amount: 350000 },
      { procedureCode: "LAB-01", procedureName: "Complete Blood Count (CBC)", amount: 85000 },
    ],
  },
  {
    id: "INV-2039",
    patientId: "PAT-402",
    patientName: "Eko Prasetyo",
    issuedAt: "2026-05-25",
    status: "overdue",
    lines: [
      { procedureCode: "ER-01", procedureName: "Emergency Room Basic Admission", amount: 500000 },
      { procedureCode: "CON-01", procedureName: "General Practitioner Consultation", amount: 150000 },
    ],
  },
  {
    id: "INV-2045",
    patientId: "PAT-415",
    patientName: "Maya Kusuma",
    issuedAt: "2026-05-30",
    status: "pending",
    lines: [
      { procedureCode: "CON-01", procedureName: "General Practitioner Consultation", amount: 150000 },
    ],
  },
];

export const invoiceTotal = (inv: Invoice) =>
  inv.lines.reduce((s, l) => s + l.amount, 0);

/** Synchronous seed snapshots for the client store (cloned before mutation). */
export const seedInvoices: Invoice[] = invoices;
export const seedWards: Ward[] = wards;
export const seedStaff: Staff[] = staff;
export const seedFormulary: FormularyItem[] = formulary;

export async function getWards(): Promise<Ward[]> {
  return wards;
}
export async function getStaff(): Promise<Staff[]> {
  return staff;
}
export async function getFormulary(): Promise<FormularyItem[]> {
  return formulary;
}
export async function getTariffs(): Promise<Tariff[]> {
  return tariffs;
}
export async function getInvoices(): Promise<Invoice[]> {
  return invoices;
}

export async function getAdminOverview() {
  const totalBeds = wards.reduce((s, w) => s + w.totalBeds, 0);
  const occupied = wards.reduce((s, w) => s + w.occupiedBeds, 0);
  const revenue = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + invoiceTotal(i), 0);
  const outstanding = invoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + invoiceTotal(i), 0);
  return {
    totalBeds,
    occupied,
    occupancyRate: occupied / totalBeds,
    staffOnDuty: staff.filter((s) => s.onDuty).length,
    staffTotal: staff.length,
    revenue,
    outstanding,
    openInvoices: invoices.filter((i) => i.status !== "paid").length,
    lowStock: formulary.filter((f) => f.stockQuantity <= f.reorderLevel).length,
  };
}

/**
 * Domain types for the Abecca Admin (hospital administration) portal.
 * Billing references the same tariff catalogue defined in
 * core_engine/src/database/seeder.rs; wards/beds/staff are the operational
 * layer the admin role manages on top of the clinical core.
 */

export interface Ward {
  id: string;
  name: string;
  department: string;
  totalBeds: number;
  occupiedBeds: number;
}

export type BedStatus = "occupied" | "available" | "cleaning";

export interface Staff {
  id: string;
  name: string;
  role: "Physician" | "Nurse" | "Pharmacist" | "Technician";
  department: string;
  shift: "Morning" | "Evening" | "Night";
  onDuty: boolean;
}

export type InvoiceStatus = "paid" | "pending" | "overdue";

export interface InvoiceLine {
  procedureCode: string;
  procedureName: string;
  amount: number;
}

export interface Invoice {
  id: string;
  patientId: string;
  patientName: string;
  issuedAt: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
}

export interface FormularyItem {
  id: number;
  medicationName: string;
  dosage: string;
  stockQuantity: number;
  reorderLevel: number;
}

export interface Tariff {
  id: number;
  procedureCode: string;
  procedureName: string;
  basePrice: number;
  category: "Consultation" | "Emergency" | "Laboratory" | "Procedure";
}

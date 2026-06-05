/**
 * Pharmacy dispensing worklist — the central Instalasi Farmasi queue. Joins every
 * active CPOE order across the tenant against what has already been dispensed,
 * surfacing the outstanding ones with their current formulary stock (and a
 * low-stock flag), plus a recent-dispense feed. Tenant-scoped; composes existing
 * stores only.
 */
import { listAllMedicationOrders } from "../clinical/medication-orders";
import { listAllDispenses, type Dispense } from "./dispenses";
import { getFormulary } from "../db";

export interface PendingOrder {
  orderId: string;
  encounterId: string;
  patientId: string;
  drugName: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  formularyId: number | null;
  stockQuantity: number | null;
  lowStock: boolean;
  prescribedAt: string;
}

export interface LowStockItem {
  formularyId: number;
  medicationName: string;
  dosage: string;
  stockQuantity: number;
  reorderLevel: number;
}

export interface PharmacyWorklist {
  generatedAt: string;
  pending: PendingOrder[];
  recent: Dispense[];
  lowStock: LowStockItem[];
}

export async function buildPharmacyWorklist(companyId: string): Promise<PharmacyWorklist> {
  const [orders, dispenses, formulary] = await Promise.all([
    listAllMedicationOrders(companyId),
    listAllDispenses(companyId),
    getFormulary(),
  ]);

  const dispensedOrderIds = new Set(dispenses.map((d) => d.orderId));
  const stockById = new Map(formulary.map((f) => [f.id, f]));

  const pending: PendingOrder[] = orders
    .filter((o) => o.status === "active" && !dispensedOrderIds.has(o.id))
    .map((o) => {
      const med = o.formularyId != null ? stockById.get(o.formularyId) : undefined;
      const stockQuantity = med?.stockQuantity ?? null;
      return {
        orderId: o.id,
        encounterId: o.encounterId,
        patientId: o.patientId,
        drugName: o.drugName,
        dose: o.dose,
        route: o.route,
        frequency: o.frequency,
        formularyId: o.formularyId,
        stockQuantity,
        lowStock: med != null && med.stockQuantity <= med.reorderLevel,
        prescribedAt: o.createdAt,
      };
    });

  const lowStock: LowStockItem[] = formulary
    .filter((f) => f.stockQuantity <= f.reorderLevel)
    .sort((a, b) => a.stockQuantity - b.stockQuantity)
    .map((f) => ({
      formularyId: f.id,
      medicationName: f.medicationName,
      dosage: f.dosage,
      stockQuantity: f.stockQuantity,
      reorderLevel: f.reorderLevel,
    }));

  return {
    generatedAt: new Date().toISOString(),
    pending,
    recent: dispenses.slice(0, 20),
    lowStock,
  };
}

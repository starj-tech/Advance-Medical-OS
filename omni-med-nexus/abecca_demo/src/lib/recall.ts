/**
 * Drug/lot recall model (Domain C/WS19) — client-safe & pure. A recall targets a
 * manufacturer lot number (batch no.) and traces every on-hand batch carrying that lot
 * across all depots — because an inter-depot transfer (6AC) clones the same lot to a new
 * location, a single recalled lot may sit in several places at once. The helpers here match
 * a lot, list the affected batches, and roll up the per-depot impact. No state, no I/O.
 */
import { locationLabel } from "@/lib/stock-transfer";

export type RecallStatus = "open" | "completed";

export const RECALL_STATUS_LABEL: Record<RecallStatus, string> = {
  open: "Terbuka",
  completed: "Ditarik",
};
export const RECALL_STATUS_VARIANT: Record<RecallStatus, "warning" | "success"> = {
  open: "warning",
  completed: "success",
};

/** Normalised (trim + case-insensitive) comparison of a batch lot against a recalled lot. */
export function matchesLot(batchNo: string, lotNo: string): boolean {
  return batchNo.trim().toLowerCase() === lotNo.trim().toLowerCase();
}

export interface RecallImpact {
  batchCount: number;
  totalQuantity: number;
  byLocation: Record<string, number>;
}

/** Batches of a given lot that still hold stock (quantity > 0) — the recall targets. */
export function affectedBatches<T extends { batchNo: string; quantity: number }>(
  batches: T[],
  lotNo: string,
): T[] {
  return batches.filter((b) => b.quantity > 0 && matchesLot(b.batchNo, lotNo));
}

/** Summarise the on-hand stock of a recalled lot: batch count, total qty, per-location split. */
export function recallImpact(
  batches: Array<{ batchNo: string; quantity: number; location: string | null }>,
  lotNo: string,
): RecallImpact {
  const hit = affectedBatches(batches, lotNo);
  const byLocation: Record<string, number> = {};
  let totalQuantity = 0;
  for (const b of hit) {
    const k = locationLabel(b.location);
    byLocation[k] = (byLocation[k] ?? 0) + b.quantity;
    totalQuantity += b.quantity;
  }
  return { batchCount: hit.length, totalQuantity, byLocation };
}

/** A lot number is recallable when it is non-blank. */
export function isValidLot(lotNo: string): boolean {
  return lotNo.trim().length > 0;
}

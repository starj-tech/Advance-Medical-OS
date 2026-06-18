/**
 * Pharmacy procurement model — client-safe so the PO form and the server share the
 * fulfillment logic. A purchase order has lines (item × ordered qty × unit price);
 * goods receipts accumulate a received qty per line. Two derived signals are pure so
 * the list, the detail, and any reporting agree: per-line/overall fulfillment (received
 * vs ordered) and money totals (IDR). No imports.
 */
export type PoStatus = "draft" | "sent" | "cancelled";

export const PO_STATUS_LABEL: Record<PoStatus, string> = {
  draft: "Draf",
  sent: "Dikirim",
  cancelled: "Dibatalkan",
};
export const PO_STATUS_VARIANT: Record<PoStatus, "muted" | "info" | "danger"> = {
  draft: "muted",
  sent: "info",
  cancelled: "danger",
};

export type Fulfillment = "pending" | "partial" | "complete";

export const FULFILLMENT_LABEL: Record<Fulfillment, string> = {
  pending: "Belum diterima",
  partial: "Diterima sebagian",
  complete: "Lengkap",
};
export const FULFILLMENT_VARIANT: Record<Fulfillment, "warning" | "info" | "success"> = {
  pending: "warning",
  partial: "info",
  complete: "success",
};

/** Quantity still to be received on a line (never negative). */
export function outstanding(ordered: number, received: number): number {
  return Math.max(0, ordered - received);
}

/** Per-line fulfillment from received vs ordered. */
export function lineFulfillment(ordered: number, received: number): Fulfillment {
  if (received <= 0) return "pending";
  if (received >= ordered) return "complete";
  return "partial";
}

/** Roll-up fulfillment: complete only when every line is complete. */
export function poFulfillment(lines: { ordered: number; received: number }[]): Fulfillment {
  if (lines.length === 0) return "pending";
  if (lines.every((l) => l.received >= l.ordered)) return "complete";
  if (lines.some((l) => l.received > 0)) return "partial";
  return "pending";
}

/** Money: a single line's extended cost (IDR), clamped at zero. */
export function lineTotal(quantity: number, unitPrice: number): number {
  return Math.max(0, quantity) * Math.max(0, unitPrice);
}

/** Money: the PO's total ordered value (IDR). */
export function poTotal(lines: { quantity: number; unitPrice: number }[]): number {
  return lines.reduce((sum, l) => sum + lineTotal(l.quantity, l.unitPrice), 0);
}

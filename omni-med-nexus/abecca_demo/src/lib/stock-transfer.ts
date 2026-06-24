/**
 * Inter-depot stock transfer model (Domain C/WS19) — client-safe & pure. A transfer moves
 * a quantity of one batch from its current location to a destination depot; stock is
 * conserved (source decremented, an equal batch created at the destination). The helpers
 * here group on-hand stock by location and validate a proposed transfer. No imports.
 */
export const DEFAULT_LOCATION = "Gudang Pusat";

/** Display label for a batch location (null/blank → the main store). */
export function locationLabel(location: string | null | undefined): string {
  return (typeof location === "string" && location.trim()) || DEFAULT_LOCATION;
}

/** Sum batch quantities by location label (null → default), for a per-depot stock view. */
export function stockByLocation(
  batches: Array<{ location: string | null; quantity: number }>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of batches) {
    const k = locationLabel(b.location);
    out[k] = (out[k] ?? 0) + b.quantity;
  }
  return out;
}

/** A transfer is valid when the quantity is a positive integer not exceeding available source stock. */
export function canTransfer(available: number, quantity: number): boolean {
  return Number.isInteger(quantity) && quantity > 0 && quantity <= available;
}

/** Whether the destination differs from the source location (no-op transfers rejected). */
export function isDistinctLocation(from: string | null, to: string | null): boolean {
  return locationLabel(from) !== locationLabel(to);
}

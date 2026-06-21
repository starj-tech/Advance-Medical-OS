/**
 * Vendor contract model (Domain K — procurement/legal). Client-safe & pure so the contract
 * form, the register, and the server agree. A contract has an admin status (active/terminated)
 * and an end date; while active, the renewal/expiry state is derived from that date
 * (expired/expiring_soon/ok) with a 60-day lead window (longer than equipment calibration,
 * since contract renewals need procurement lead time). No imports.
 */
export type ContractStatus = "active" | "terminated";
export const CONTRACT_STATUSES: ContractStatus[] = ["active", "terminated"];
export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  active: "Aktif", terminated: "Diakhiri",
};
export const CONTRACT_STATUS_VARIANT: Record<ContractStatus, "success" | "muted"> = {
  active: "success", terminated: "muted",
};

export type ContractType = "maintenance" | "supply" | "service" | "license" | "lease" | "other";
export const CONTRACT_TYPES: ContractType[] = ["maintenance", "supply", "service", "license", "lease", "other"];
export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  maintenance: "Pemeliharaan", supply: "Pasokan/barang", service: "Jasa/layanan",
  license: "Lisensi", lease: "Sewa", other: "Lainnya",
};

export type ContractExpiry = "ok" | "expiring_soon" | "expired";
export const CONTRACT_EXPIRY_LABEL: Record<ContractExpiry, string> = {
  ok: "Berlaku", expiring_soon: "Segera berakhir", expired: "Kedaluwarsa",
};
export const CONTRACT_EXPIRY_VARIANT: Record<ContractExpiry, "success" | "warning" | "danger"> = {
  ok: "success", expiring_soon: "warning", expired: "danger",
};

/** Whole days until the contract end date (negative once past); null when open-ended. */
export function daysUntilEnd(endDate: string | null, now: Date): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - now.getTime()) / 86_400_000);
}

/** Renewal/expiry state from the end date: expired past it, expiring_soon within `soonDays` (default 60), else ok; null if open-ended. */
export function contractExpiry(endDate: string | null, now: Date, soonDays = 60): ContractExpiry | null {
  const days = daysUntilEnd(endDate, now);
  if (days === null) return null;
  if (days < 0) return "expired";
  if (days <= soonDays) return "expiring_soon";
  return "ok";
}

export const isContractStatus = (v: unknown): v is ContractStatus =>
  typeof v === "string" && (CONTRACT_STATUSES as string[]).includes(v);
export const isContractType = (v: unknown): v is ContractType =>
  typeof v === "string" && (CONTRACT_TYPES as string[]).includes(v);

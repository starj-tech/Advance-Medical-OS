/**
 * Health-worker credential model — client-safe so the registry form and the
 * server share the licence types and the expiry-status logic. Tracks the
 * Indonesian practice licences (STR/SIP/…) every facility must keep current for
 * KARS accreditation; the status is derived purely from the expiry date so the
 * dashboard and any alerting agree. No imports (pure).
 */
export type CredentialType = "STR" | "SIP" | "SIPA" | "SIPB" | "SIPP" | "lainnya";

export const CREDENTIAL_TYPES: CredentialType[] = ["STR", "SIP", "SIPA", "SIPB", "SIPP", "lainnya"];

export const CREDENTIAL_TYPE_LABEL: Record<CredentialType, string> = {
  STR: "STR — Surat Tanda Registrasi",
  SIP: "SIP — Surat Izin Praktik (dokter)",
  SIPA: "SIPA — Surat Izin Praktik Apoteker",
  SIPB: "SIPB — Surat Izin Praktik Bidan",
  SIPP: "SIPP — Surat Izin Praktik Perawat",
  lainnya: "Lainnya",
};

export const isCredentialType = (v: unknown): v is CredentialType =>
  typeof v === "string" && (CREDENTIAL_TYPES as string[]).includes(v);

export type CredentialStatus = "valid" | "expiring_soon" | "expired";

export const CREDENTIAL_STATUS_LABEL: Record<CredentialStatus, string> = {
  valid: "Berlaku",
  expiring_soon: "Segera kedaluwarsa",
  expired: "Kedaluwarsa",
};

export const CREDENTIAL_STATUS_VARIANT: Record<CredentialStatus, "success" | "warning" | "danger"> = {
  valid: "success",
  expiring_soon: "warning",
  expired: "danger",
};

/** Whole days from `now` until the expiry date (negative once expired). */
export function daysUntil(expiryDate: string, now: Date): number {
  const exp = new Date(expiryDate).getTime();
  return Math.ceil((exp - now.getTime()) / 86_400_000);
}

/**
 * Derive the credential status. Expired once the date has passed; "expiring_soon"
 * within `soonDays` (default 90) of expiry; otherwise valid.
 */
export function credentialStatus(expiryDate: string, now: Date, soonDays = 90): CredentialStatus {
  const days = daysUntil(expiryDate, now);
  if (days < 0) return "expired";
  if (days <= soonDays) return "expiring_soon";
  return "valid";
}

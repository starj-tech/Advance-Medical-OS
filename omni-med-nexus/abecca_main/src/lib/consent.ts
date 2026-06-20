/**
 * Informed-consent model (compliance: UU PDP / GDPR / HIPAA / KARS) — client-safe & pure
 * so the consent form, the register badges, and the server agree on the *effective*
 * status. A consent is recorded as a decision (granted/withdrawn) with an optional
 * validity window; the effective status is derived (withdrawn > expired > active) so a
 * lapsed or revoked consent never reads as active. No imports.
 */
export type ConsentType =
  | "general_treatment"
  | "surgery"
  | "anesthesia"
  | "blood_transfusion"
  | "data_sharing"
  | "research"
  | "media";

export const CONSENT_TYPES: ConsentType[] = [
  "general_treatment", "surgery", "anesthesia", "blood_transfusion", "data_sharing", "research", "media",
];
export const CONSENT_TYPE_LABEL: Record<ConsentType, string> = {
  general_treatment: "Tindakan medis umum",
  surgery: "Operasi / pembedahan",
  anesthesia: "Anestesi",
  blood_transfusion: "Transfusi darah",
  data_sharing: "Berbagi data (SATUSEHAT/rujukan)",
  research: "Penelitian",
  media: "Foto / media",
};

/** What was recorded. */
export type ConsentDecision = "granted" | "withdrawn";

/** Derived, time-aware status used everywhere for display & checks. */
export type ConsentStatus = "active" | "expired" | "withdrawn";
export const CONSENT_STATUS_LABEL: Record<ConsentStatus, string> = {
  active: "Berlaku", expired: "Kedaluwarsa", withdrawn: "Dicabut",
};
export const CONSENT_STATUS_VARIANT: Record<ConsentStatus, "success" | "warning" | "danger"> = {
  active: "success", expired: "warning", withdrawn: "danger",
};

interface ConsentLike {
  consentType?: ConsentType;
  decision: ConsentDecision;
  withdrawnAt?: string | null;
  validUntil?: string | null;
}

/** Withdrawn (explicit or by decision) wins; else expired past validUntil; else active. */
export function effectiveStatus(c: ConsentLike, now: Date): ConsentStatus {
  if (c.decision === "withdrawn" || c.withdrawnAt) return "withdrawn";
  if (c.validUntil && new Date(c.validUntil).getTime() < now.getTime()) return "expired";
  return "active";
}

/** Does the patient hold an active consent of the required type right now? */
export function requiredConsentMet(consents: ConsentLike[], type: ConsentType, now: Date): boolean {
  return consents.some((c) => c.consentType === type && effectiveStatus(c, now) === "active");
}

export const isConsentType = (v: unknown): v is ConsentType =>
  typeof v === "string" && (CONSENT_TYPES as string[]).includes(v);

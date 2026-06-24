/**
 * SBAR handover / serah-terima pasien (Domain E) — client-safe & pure. SBAR structures a
 * shift/unit handover into Situation, Background, Assessment, Recommendation — the KARS SKP-2
 * effective-communication standard. A handover must carry all four parts to be valid, and
 * moves from pending to acknowledged once the receiving nurse confirms it. No state, no I/O.
 */
export interface SbarParts {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
}

export const SBAR_FIELDS: { key: keyof SbarParts; label: string; hint: string }[] = [
  { key: "situation", label: "Situation (Situasi)", hint: "Kondisi terkini & alasan handover" },
  { key: "background", label: "Background (Latar belakang)", hint: "Riwayat singkat, diagnosis, terapi" },
  { key: "assessment", label: "Assessment (Penilaian)", hint: "Penilaian klinis & masalah aktif" },
  { key: "recommendation", label: "Recommendation (Rekomendasi)", hint: "Tindak lanjut & yang perlu dipantau" },
];

export type HandoverStatus = "pending" | "acknowledged";
export const HANDOVER_STATUS_LABEL: Record<HandoverStatus, string> = {
  pending: "Menunggu konfirmasi", acknowledged: "Diterima",
};
export const HANDOVER_STATUS_VARIANT: Record<HandoverStatus, "warning" | "success"> = {
  pending: "warning", acknowledged: "success",
};

export type HandoverShift = "morning" | "afternoon" | "night";
export const HANDOVER_SHIFT_LABEL: Record<HandoverShift, string> = {
  morning: "Pagi", afternoon: "Siang", night: "Malam",
};
export function isHandoverShift(v: unknown): v is HandoverShift {
  return v === "morning" || v === "afternoon" || v === "night";
}

const nonBlank = (s: string | undefined): boolean => typeof s === "string" && s.trim().length > 0;

/** Count of SBAR sections that carry content (0–4). */
export function filledSections(parts: Partial<SbarParts>): number {
  return SBAR_FIELDS.reduce((n, f) => n + (nonBlank(parts[f.key]) ? 1 : 0), 0);
}

/** A handover is complete only when all four SBAR parts are present. */
export function isComplete(parts: Partial<SbarParts>): boolean {
  return filledSections(parts) === SBAR_FIELDS.length;
}

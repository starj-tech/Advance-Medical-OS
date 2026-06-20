/**
 * Patient experience model (CSAT + NPS) — client-safe & pure so the survey form, the
 * dashboard, and the server agree. Each response carries an NPS score (0–10, "how likely
 * to recommend") and an optional CSAT rating (1–5 satisfaction). NPS buckets into
 * promoter/passive/detractor; the net score is %promoters − %detractors. No imports.
 */
export type NpsCategory = "promoter" | "passive" | "detractor";
export const NPS_CATEGORY_LABEL: Record<NpsCategory, string> = {
  promoter: "Promotor", passive: "Pasif", detractor: "Detraktor",
};
export const NPS_CATEGORY_VARIANT: Record<NpsCategory, "success" | "muted" | "danger"> = {
  promoter: "success", passive: "muted", detractor: "danger",
};

/** NPS bucket: 9–10 promoter, 7–8 passive, 0–6 detractor. */
export function npsCategory(score: number): NpsCategory {
  if (score >= 9) return "promoter";
  if (score >= 7) return "passive";
  return "detractor";
}

export interface NpsCounts { promoter: number; passive: number; detractor: number }

/** Net Promoter Score: %promoters − %detractors, integer in [−100, 100]; null if no responses. */
export function npsValue(c: NpsCounts): number | null {
  const total = c.promoter + c.passive + c.detractor;
  if (total <= 0) return null;
  return Math.round(((c.promoter - c.detractor) / total) * 100);
}

/** Mean satisfaction (1–5) to one decimal place; null if there are no ratings. */
export function csatAverage(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((s, r) => s + r, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

export type FeedbackSource = "post_visit" | "discharge" | "digital" | "other";
export const FEEDBACK_SOURCES: FeedbackSource[] = ["post_visit", "discharge", "digital", "other"];
export const FEEDBACK_SOURCE_LABEL: Record<FeedbackSource, string> = {
  post_visit: "Pasca-kunjungan", discharge: "Saat pulang", digital: "Survei digital", other: "Lainnya",
};

export const isNpsScore = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 10;
export const isCsatRating = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;
export const isFeedbackSource = (v: unknown): v is FeedbackSource =>
  typeof v === "string" && (FEEDBACK_SOURCES as string[]).includes(v);

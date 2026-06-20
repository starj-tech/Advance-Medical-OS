/**
 * Patient experience register (CSAT + NPS). Stores survey responses and rolls them up
 * into a net promoter score and a mean satisfaction. Pairs with the complaints module:
 * complaints capture what went wrong, feedback captures overall sentiment. The scoring
 * lives in lib/feedback so the dashboard and server agree. Tenant-scoped; env-gated.
 */
import { getSupabase } from "../supabase";
import { npsCategory, npsValue, csatAverage, type FeedbackSource, type NpsCounts } from "@/lib/feedback";

export interface Feedback {
  id: string;
  companyId: string;
  patientId: string | null;
  source: FeedbackSource;
  npsScore: number;
  csatRating: number | null;
  comment: string | null;
  createdAt: string;
}

type Row = {
  id: string; company_id: string; patient_id: string | null; source: string;
  nps_score: number; csat_rating: number | null; comment: string | null; created_at: string;
};
const toFeedback = (r: Row): Feedback => ({
  id: r.id, companyId: r.company_id, patientId: r.patient_id, source: r.source as FeedbackSource,
  npsScore: Number(r.nps_score), csatRating: r.csat_rating === null ? null : Number(r.csat_rating),
  comment: r.comment, createdAt: r.created_at,
});

const g = globalThis as unknown as { __abeccaFeedback?: Feedback[] };
const store = g.__abeccaFeedback ?? (g.__abeccaFeedback = []);

export async function createFeedback(
  companyId: string,
  input: { patientId?: string | null; source: FeedbackSource; npsScore: number; csatRating?: number | null; comment?: string | null; createdAt?: string | null },
): Promise<Feedback> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("patient_feedback")
      .insert({ company_id: companyId, patient_id: input.patientId ?? null, source: input.source, nps_score: input.npsScore, csat_rating: input.csatRating ?? null, comment: input.comment ?? null, ...(input.createdAt ? { created_at: input.createdAt } : {}) })
      .select("*").single();
    if (error || !data) throw new Error(error?.message ?? "create feedback failed");
    return toFeedback(data as Row);
  }
  const f: Feedback = {
    id: crypto.randomUUID(), companyId, patientId: input.patientId ?? null, source: input.source,
    npsScore: input.npsScore, csatRating: input.csatRating ?? null, comment: input.comment ?? null,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  store.push(f);
  return f;
}

export async function listFeedback(companyId: string): Promise<Feedback[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("patient_feedback").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    return (data ?? []).map((r) => toFeedback(r as Row));
  }
  return store.filter((f) => f.companyId === companyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface FeedbackSummary {
  total: number;
  nps: number | null;
  counts: NpsCounts;
  csatAverage: number | null;
  csatCount: number;
}

export async function feedbackSummary(companyId: string): Promise<FeedbackSummary> {
  const all = await listFeedback(companyId);
  const counts: NpsCounts = { promoter: 0, passive: 0, detractor: 0 };
  const csatRatings: number[] = [];
  for (const f of all) {
    counts[npsCategory(f.npsScore)] += 1;
    if (f.csatRating !== null) csatRatings.push(f.csatRating);
  }
  return {
    total: all.length,
    nps: npsValue(counts),
    counts,
    csatAverage: csatAverage(csatRatings),
    csatCount: csatRatings.length,
  };
}

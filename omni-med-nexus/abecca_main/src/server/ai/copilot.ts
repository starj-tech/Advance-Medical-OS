/**
 * Abecca Copilot — three grounded AI helpers (Fase 3, domain L):
 *   • scribe       — consultation transcript → CPPT/SOAP draft
 *   • suggestCodes — clinical text → ICD-10 (+ illustrative INA-CBG) suggestions
 *   • askData      — natural-language question answered from the tenant's own
 *                    real-time KPI snapshot (no cross-tenant data, no invention)
 *
 * Each tries Claude when ANTHROPIC_API_KEY is set, otherwise uses a deterministic
 * local fallback so dev/preview/CI work without a key. `source` reports which
 * path produced the answer. Tenant-scoped via company_id for askData.
 */
import { aiAvailable, aiComplete, aiCompleteJSON } from "./claude";
import { draftSoapHeuristic, type Soap } from "../../lib/ai/scribe";
import { suggestIcdHeuristic, type CodeSuggestion } from "../../lib/ai/coding";
import { groupByDiagnosis, type CbgGroup } from "../../lib/inacbg";
import { icd10 } from "../../lib/data";
import { buildOverview, type AnalyticsOverview } from "../analytics/overview";

export type AiSource = "ai" | "heuristic";

const rupiah = (n: number): string => `Rp${Math.round(n).toLocaleString("id-ID")}`;

// --- AI scribe -------------------------------------------------------------
export async function scribe(transcript: string): Promise<{ soap: Soap; source: AiSource }> {
  if (aiAvailable()) {
    const soap = await aiCompleteJSON<Soap>(
      "You are a clinical scribe for an Indonesian hospital. Convert the consultation transcript into a CPPT/SOAP note. Keys: subjective, objective, assessment, plan. Use Bahasa Indonesia, be concise and faithful — never invent findings.",
      transcript,
    );
    if (soap && typeof soap.subjective === "string") return { soap, source: "ai" };
  }
  return { soap: draftSoapHeuristic(transcript), source: "heuristic" };
}

// --- Coding assistant ------------------------------------------------------
export interface CodingResult {
  icd10: CodeSuggestion[];
  inacbg: CbgGroup | null;
  source: AiSource;
}

export async function suggestCodes(text: string): Promise<CodingResult> {
  let suggestions: CodeSuggestion[] | null = null;
  let source: AiSource = "heuristic";

  if (aiAvailable()) {
    // Constrain the model to a shortlist of catalogue candidates so it can only
    // pick real ICD-10 codes (no hallucinated codes).
    const shortlist = suggestIcdHeuristic(text, icd10, 25);
    const pool = (shortlist.length ? shortlist : Object.entries(icd10).slice(0, 40).map(([code, description]) => ({ code, description, score: 0 })))
      .map((c) => `${c.code}: ${c.description}`)
      .join("\n");
    const out = await aiCompleteJSON<{ code: string; description: string }[]>(
      `You are a clinical coder. From ONLY this ICD-10 candidate list, pick the up-to-5 best matches for the clinical text. Return an array of {code, description} using codes exactly as listed.\n\nCandidates:\n${pool}`,
      text,
    );
    if (Array.isArray(out)) {
      suggestions = out
        .filter((o) => o && typeof o.code === "string" && icd10[o.code])
        .slice(0, 5)
        .map((o) => ({ code: o.code, description: icd10[o.code], score: 0 }));
      if (suggestions.length) source = "ai";
    }
  }

  if (!suggestions || suggestions.length === 0) {
    suggestions = suggestIcdHeuristic(text, icd10, 5);
    source = "heuristic";
  }

  const top = suggestions[0]?.code ?? null;
  return { icd10: suggestions, inacbg: top ? groupByDiagnosis(top) : null, source };
}

// --- Ask-your-data (grounded on the tenant KPI snapshot) -------------------
export interface AskResult {
  answer: string;
  snapshot: AnalyticsOverview;
  source: AiSource;
}

function heuristicAnswer(q: string, s: AnalyticsOverview): string {
  const t = q.toLowerCase();
  if (/(bor|okupansi|hunian|tempat tidur|bed)/.test(t)) {
    return `BOR keseluruhan ${s.occupancy.bor}% — ${s.occupancy.occupied} dari ${s.occupancy.totalBeds} bed terisi (${s.occupancy.available} tersedia).`;
  }
  if (/(pendapatan|revenue|tagih|piutang|bayar|collection)/.test(t)) {
    return `Total tagihan ${rupiah(s.revenue.totalCharges)}, terbayar ${rupiah(s.revenue.totalPaid)} (collection rate ${s.revenue.collectionRate}%), outstanding ${rupiah(s.revenue.outstanding)}.`;
  }
  if (/(diagnos|penyakit|top|icd)/.test(t)) {
    if (s.topDiagnoses.length === 0) return "Belum ada diagnosis tercatat.";
    return "Top diagnosis: " + s.topDiagnoses.slice(0, 5).map((d) => `${d.code} ${d.description} (${d.count})`).join("; ") + ".";
  }
  if (/(ikp|insiden|keselamatan|safety|sentinel)/.test(t)) {
    return `Insiden keselamatan: ${s.safety.total} total, ${s.safety.open} terbuka. Merah ${s.safety.byGrading.merah}, kuning ${s.safety.byGrading.kuning}.`;
  }
  if (/(aktif|berjalan|in_progress|rawat|kunjungan|encounter|pasien)/.test(t)) {
    return `Total ${s.encounters.total} encounter (${s.encounters.active} aktif). Rawat jalan ${s.encounters.byType.outpatient}, rawat inap ${s.encounters.byType.inpatient}, IGD ${s.encounters.byType.ed}, ODC ${s.encounters.byType.odc}.`;
  }
  return `Ringkasan: ${s.encounters.total} encounter (${s.encounters.active} aktif), BOR ${s.occupancy.bor}%, collection rate ${s.revenue.collectionRate}%, ${s.safety.open} insiden terbuka.`;
}

export async function askData(companyId: string, question: string): Promise<AskResult> {
  const snapshot = await buildOverview(companyId);
  if (aiAvailable()) {
    const answer = await aiComplete(
      "You answer hospital-executive questions in Bahasa Indonesia using ONLY the JSON KPI snapshot provided. If the snapshot lacks the answer, say so. Be concise (1-3 sentences). Never invent numbers.",
      `Snapshot:\n${JSON.stringify(snapshot)}\n\nPertanyaan: ${question}`,
      512,
    );
    if (answer) return { answer, snapshot, source: "ai" };
  }
  return { answer: heuristicAnswer(question, snapshot), snapshot, source: "heuristic" };
}

/**
 * Coding assistant — suggest ICD-10 codes from clinical text. Deterministic,
 * dependency-free fallback (client-safe): token-overlap ranking over the ICD-10
 * catalogue. The server upgrades to Claude when configured, but always
 * constrains suggestions to the catalogue. Suggestions are advisory — the coder
 * confirms the final code.
 */
export interface CodeSuggestion {
  code: string;
  description: string;
  /** Number of query terms matched in the description (higher = better). */
  score: number;
}

const STOPWORDS = new Set([
  "yang", "dengan", "pada", "dari", "untuk", "dan", "atau", "pasien", "tahun",
  "hari", "with", "and", "the", "for", "patient", "tanpa", "akut", "kronik",
]);

function tokenize(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.toLowerCase().split(/[^a-z]+/)) {
    if (raw.length >= 4 && !STOPWORDS.has(raw) && !seen.has(raw)) {
      seen.add(raw);
      out.push(raw);
    }
  }
  return out;
}

/**
 * Rank catalogue entries by how many query terms appear in each description.
 * `catalog` maps ICD-10 code → description.
 */
export function suggestIcdHeuristic(
  text: string,
  catalog: Record<string, string>,
  limit = 5,
): CodeSuggestion[] {
  const terms = tokenize(text);
  if (terms.length === 0) return [];
  const scored: CodeSuggestion[] = [];
  for (const [code, description] of Object.entries(catalog)) {
    const desc = description.toLowerCase();
    let score = 0;
    for (const t of terms) if (desc.includes(t)) score += 1;
    if (score > 0) scored.push({ code, description, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))
    .slice(0, limit);
}

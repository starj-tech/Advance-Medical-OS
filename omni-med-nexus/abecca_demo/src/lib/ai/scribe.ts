/**
 * AI scribe — turn a free-text consultation transcript into a structured
 * CPPT/SOAP draft. This module is the deterministic, dependency-free fallback
 * (client-safe) used when no LLM is configured; the server upgrades to Claude
 * when ANTHROPIC_API_KEY is set. Either way the output is a *draft* a clinician
 * must review.
 */
export interface Soap {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

type Section = keyof Soap;

// Indonesian/English cue words that route a sentence into a SOAP section.
// Checked in priority order; an unmatched sentence defaults to Subjective.
const CUES: { section: Section; words: string[] }[] = [
  { section: "assessment", words: ["diagnosis", "diagnosa", "kesan", "suspek", "susp ", "dd/", "dd ", "assessment", "impresi", "kemungkinan", "icd"] },
  { section: "plan", words: ["rencana", "terapi", "tatalaksana", "beri ", "berikan", "resep", "obat", "mg", "ml", "tablet", "kapsul", "infus", "injeksi", "kontrol", "rujuk", "anjuran", "edukasi", "observasi", "lanjutkan", "puasa", "diet"] },
  { section: "objective", words: ["td ", "tekanan darah", "nadi", "suhu", "rr ", "spo2", "saturasi", "hr ", "mmhg", "°c", "pemeriksaan", "tampak", "auskultasi", "palpasi", "inspeksi", "lab", "rontgen", "ronthen", "hasil", "gcs", "bb ", "tb ", "fisik"] },
];

function classify(sentence: string): Section {
  const s = sentence.toLowerCase();
  for (const { section, words } of CUES) {
    if (words.some((w) => s.includes(w))) return section;
  }
  return "subjective";
}

/** Split a transcript into sentence-ish segments on newlines and terminal punctuation. */
function segment(text: string): string[] {
  return text
    .split(/\n|(?<=[.;])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function draftSoapHeuristic(transcript: string): Soap {
  const buckets: Record<Section, string[]> = {
    subjective: [], objective: [], assessment: [], plan: [],
  };
  for (const seg of segment(transcript)) {
    buckets[classify(seg)].push(seg.replace(/\s+/g, " "));
  }
  const join = (xs: string[]): string => xs.join(" ").trim();
  return {
    subjective: join(buckets.subjective),
    objective: join(buckets.objective),
    assessment: join(buckets.assessment),
    plan: join(buckets.plan),
  };
}

/**
 * Emergency Severity Index (ESI) — the standard 5-level ED triage algorithm,
 * implemented as a pure decision tree so it is identical on the triage form
 * (live preview) and the server, and fully unit-testable. Levels: 1 resuscitation
 * (most acute) … 5 non-urgent. Client-safe (no imports).
 *
 * Decision A: needs an immediate life-saving intervention?            → 1
 * Decision B: high-risk / altered mental status / severe pain?         → 2
 * Decision C: estimated resources — 0 → 5, 1 → 4, ≥2 → 3
 * Decision D: a level-3 patient with danger-zone vital signs upgrades  → 2
 */
export type EsiLevel = 1 | 2 | 3 | 4 | 5;

export const ESI_LEVELS: EsiLevel[] = [1, 2, 3, 4, 5];

export const ESI_LABEL: Record<EsiLevel, string> = {
  1: "Resusitasi",
  2: "Emergent",
  3: "Urgent",
  4: "Kurang urgent",
  5: "Non-urgent",
};

/** Badge colour per level — most acute (1–2) red, then amber/blue/grey. */
export const ESI_VARIANT: Record<EsiLevel, "danger" | "warning" | "info" | "muted"> = {
  1: "danger",
  2: "danger",
  3: "warning",
  4: "info",
  5: "muted",
};

export interface EsiInput {
  /** Decision A — needs an immediate life-saving intervention. */
  lifeSaving: boolean;
  /** Decision B — high-risk situation, altered mental status, or severe pain/distress. */
  highRisk: boolean;
  /** Decision C — estimated number of resources (clamped; ≥2 counts as "many"). */
  resources: number;
  /** Decision D — vital signs in the danger zone (upgrades a level-3 to level-2). */
  dangerVitals: boolean;
}

export interface EsiResult {
  level: EsiLevel;
  rationale: string;
}

export function computeEsi(input: EsiInput): EsiResult {
  if (input.lifeSaving) {
    return { level: 1, rationale: "Butuh intervensi penyelamatan jiwa segera" };
  }
  if (input.highRisk) {
    return { level: 2, rationale: "Situasi risiko tinggi / penurunan kesadaran / nyeri berat" };
  }
  const resources = Math.max(0, Math.floor(input.resources));
  if (resources === 0) return { level: 5, rationale: "Tanpa sumber daya — non-urgent" };
  if (resources === 1) return { level: 4, rationale: "Satu sumber daya — kurang urgent" };
  if (input.dangerVitals) {
    return { level: 2, rationale: "Banyak sumber daya + tanda vital zona bahaya → naik ke level 2" };
  }
  return { level: 3, rationale: "Dua sumber daya atau lebih — urgent" };
}

export const isEsiLevel = (v: unknown): v is EsiLevel =>
  typeof v === "number" && (ESI_LEVELS as number[]).includes(v);

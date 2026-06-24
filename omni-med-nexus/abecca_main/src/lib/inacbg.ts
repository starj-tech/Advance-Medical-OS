/**
 * Simplified, illustrative INA-CBG case-mix grouper (client-safe).
 *
 * NOTE: This is a transparent, rule-based approximation for demo/estimation —
 * NOT the licensed Kemenkes INA-CBG grouper. A real deployment swaps this for
 * the official grouper/tariff master. It maps a primary ICD-10 diagnosis to a
 * case-base group and a package tariff that varies by care class.
 */
export type CareClass = "3" | "2" | "1" | "vip";

export interface CbgGroup {
  code: string;
  description: string;
  /** Base package tariff (IDR) at care class 3. */
  baseTariff: number;
}

interface Rule {
  /** Uppercase ICD-10 prefixes that map to this group. */
  prefixes: string[];
  group: CbgGroup;
}

// Illustrative tariffs (IDR). Ordered most-specific first.
const RULES: Rule[] = [
  { prefixes: ["E10", "E11", "E12", "E13", "E14"], group: { code: "E-4-10-I", description: "Diabetes Melitus", baseTariff: 4_200_000 } },
  { prefixes: ["I10", "I11", "I12", "I13", "I15"], group: { code: "I-4-12-I", description: "Hipertensi", baseTariff: 3_500_000 } },
  { prefixes: ["I20", "I21", "I22", "I25"], group: { code: "I-4-15-I", description: "Penyakit Jantung Iskemik", baseTariff: 9_500_000 } },
  { prefixes: ["J18", "J15", "J12"], group: { code: "J-4-10-I", description: "Pneumonia & Infeksi Paru", baseTariff: 6_800_000 } },
  { prefixes: ["J44", "J45", "J46"], group: { code: "J-4-13-I", description: "Asma & PPOK", baseTariff: 4_000_000 } },
  { prefixes: ["A09", "K52", "K59"], group: { code: "K-4-17-I", description: "Gastroenteritis", baseTariff: 3_200_000 } },
  { prefixes: ["K35", "K36", "K37"], group: { code: "K-1-20-I", description: "Apendisitis (bedah)", baseTariff: 8_900_000 } },
  { prefixes: ["N39", "N30", "N10"], group: { code: "N-4-10-I", description: "Infeksi Saluran Kemih", baseTariff: 3_000_000 } },
  { prefixes: ["O80", "O81", "O82"], group: { code: "O-6-10-I", description: "Persalinan", baseTariff: 5_500_000 } },
  { prefixes: ["A91", "A90"], group: { code: "A-4-11-I", description: "Demam Berdarah Dengue", baseTariff: 5_200_000 } },
  { prefixes: ["S", "T"], group: { code: "U-3-10-I", description: "Cedera & Trauma", baseTariff: 4_500_000 } },
];

const DEFAULT_GROUP: CbgGroup = { code: "Z-3-00-0", description: "Kasus Umum / Lainnya", baseTariff: 2_500_000 };

const CLASS_MULTIPLIER: Record<CareClass, number> = { "3": 1.0, "2": 1.2, "1": 1.5, vip: 1.9 };
export const CARE_CLASSES: CareClass[] = ["3", "2", "1", "vip"];
export const CARE_CLASS_LABEL: Record<CareClass, string> = {
  "3": "Kelas 3", "2": "Kelas 2", "1": "Kelas 1", vip: "VIP",
};

export function groupByDiagnosis(icd10?: string | null): CbgGroup {
  const code = (icd10 ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) return DEFAULT_GROUP;
  for (const rule of RULES) {
    if (rule.prefixes.some((p) => code.startsWith(p))) return rule.group;
  }
  return DEFAULT_GROUP;
}

export function tariffForClass(group: CbgGroup, careClass: CareClass): number {
  return Math.round(group.baseTariff * (CLASS_MULTIPLIER[careClass] ?? 1));
}

export const isCareClass = (c: unknown): c is CareClass =>
  typeof c === "string" && (CARE_CLASSES as string[]).includes(c);

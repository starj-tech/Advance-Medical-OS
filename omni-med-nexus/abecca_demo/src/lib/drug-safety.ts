/**
 * Clinical Decision Support for prescribing — allergy, drug–drug interaction and
 * duplicate-therapy screening. Pure & client-safe (no imports), so both the BFF
 * order route and any UI preview can share one knowledge base.
 *
 * This is a deliberately small, transparent rule set seeded to cover the house
 * formulary plus common Indonesian-market drugs; a hospital extends DRUG_FACTS /
 * INTERACTIONS as its formulary grows. It is decision *support*, not a substitute
 * for a licensed drug database.
 */

export type AlertSeverity = "high" | "moderate" | "info";
export type AlertKind = "allergy" | "interaction" | "duplicate";

export interface SafetyAlert {
  kind: AlertKind;
  severity: AlertSeverity;
  message: string;
}

interface DrugFact {
  /** Lowercase substring matched against a medication name. */
  match: string;
  name: string;
  /** Pharmacologic classes used by the interaction table. */
  classes: string[];
  /** Ingredient/allergen tokens used by allergy cross-checks. */
  ingredients: string[];
}

// Keyed by a token found in the medication name. Order doesn't matter; the first
// substring hit wins for the display name.
const DRUG_FACTS: DrugFact[] = [
  // --- house formulary ---
  { match: "amoxicillin", name: "Amoxicillin", classes: ["antibiotic", "penicillin", "beta_lactam"], ingredients: ["amoxicillin", "penicillin"] },
  { match: "paracetamol", name: "Paracetamol", classes: ["analgesic", "antipyretic"], ingredients: ["paracetamol", "acetaminophen"] },
  { match: "metformin", name: "Metformin", classes: ["antidiabetic", "biguanide"], ingredients: ["metformin"] },
  { match: "insulin", name: "Insulin", classes: ["antidiabetic", "insulin"], ingredients: ["insulin"] },
  { match: "furosemide", name: "Furosemide", classes: ["diuretic", "loop_diuretic", "sulfonamide_derived"], ingredients: ["furosemide"] },
  { match: "salbutamol", name: "Salbutamol", classes: ["bronchodilator", "beta2_agonist"], ingredients: ["salbutamol", "albuterol"] },
  // --- common extras (forward-compatible as the formulary grows) ---
  { match: "ampicillin", name: "Ampicillin", classes: ["antibiotic", "penicillin", "beta_lactam"], ingredients: ["ampicillin", "penicillin"] },
  { match: "penicillin", name: "Penicillin", classes: ["antibiotic", "penicillin", "beta_lactam"], ingredients: ["penicillin"] },
  { match: "cefadroxil", name: "Cefadroxil", classes: ["antibiotic", "cephalosporin", "beta_lactam"], ingredients: ["cephalosporin"] },
  { match: "ceftriaxone", name: "Ceftriaxone", classes: ["antibiotic", "cephalosporin", "beta_lactam"], ingredients: ["cephalosporin"] },
  { match: "cotrimoxazole", name: "Cotrimoxazole", classes: ["antibiotic", "sulfonamide"], ingredients: ["sulfonamide", "sulfa"] },
  { match: "warfarin", name: "Warfarin", classes: ["anticoagulant"], ingredients: ["warfarin"] },
  { match: "aspirin", name: "Aspirin", classes: ["nsaid", "antiplatelet", "salicylate"], ingredients: ["aspirin", "salicylate"] },
  { match: "ibuprofen", name: "Ibuprofen", classes: ["nsaid"], ingredients: ["ibuprofen"] },
  { match: "ketorolac", name: "Ketorolac", classes: ["nsaid"], ingredients: ["ketorolac"] },
  { match: "captopril", name: "Captopril", classes: ["ace_inhibitor"], ingredients: ["captopril"] },
  { match: "lisinopril", name: "Lisinopril", classes: ["ace_inhibitor"], ingredients: ["lisinopril"] },
  { match: "spironolactone", name: "Spironolactone", classes: ["diuretic", "potassium_sparing"], ingredients: ["spironolactone"] },
  { match: "simvastatin", name: "Simvastatin", classes: ["statin"], ingredients: ["simvastatin"] },
  { match: "tramadol", name: "Tramadol", classes: ["opioid"], ingredients: ["tramadol"] },
];

interface InteractionRule {
  a: string;
  b: string;
  severity: AlertSeverity;
  note: string;
}

// Unordered class pairs. Same class on both sides flags therapeutic overlap.
const INTERACTIONS: InteractionRule[] = [
  { a: "loop_diuretic", b: "beta2_agonist", severity: "moderate", note: "Risiko hipokalemia aditif (diuretik loop + beta-2 agonis)." },
  { a: "loop_diuretic", b: "antidiabetic", severity: "moderate", note: "Diuretik loop dapat menurunkan kontrol glikemik." },
  { a: "anticoagulant", b: "nsaid", severity: "high", note: "Peningkatan risiko perdarahan (antikoagulan + NSAID)." },
  { a: "anticoagulant", b: "antiplatelet", severity: "high", note: "Peningkatan risiko perdarahan (antikoagulan + antiplatelet)." },
  { a: "ace_inhibitor", b: "potassium_sparing", severity: "high", note: "Risiko hiperkalemia (ACE inhibitor + diuretik hemat kalium)." },
  { a: "ace_inhibitor", b: "nsaid", severity: "moderate", note: "NSAID menurunkan efek antihipertensi & menambah risiko ginjal." },
  { a: "nsaid", b: "nsaid", severity: "moderate", note: "Duplikasi NSAID; risiko gastrointestinal & ginjal." },
];

// Free-text allergen (incl. Indonesian spelling) → canonical class/ingredient
// tokens used by DRUG_FACTS. Keys are normalised (lowercase, letters only).
const ALLERGEN_SYNONYMS: Record<string, string[]> = {
  penisilin: ["penicillin", "beta_lactam"],
  penicillin: ["penicillin", "beta_lactam"],
  amoksisilin: ["amoxicillin", "penicillin", "beta_lactam"],
  amoxicillin: ["amoxicillin", "penicillin", "beta_lactam"],
  ampisilin: ["ampicillin", "penicillin", "beta_lactam"],
  betalaktam: ["beta_lactam"],
  sefalosporin: ["cephalosporin", "beta_lactam"],
  cephalosporin: ["cephalosporin", "beta_lactam"],
  sulfa: ["sulfonamide", "sulfonamide_derived"],
  sulfonamida: ["sulfonamide", "sulfonamide_derived"],
  sulfonamide: ["sulfonamide", "sulfonamide_derived"],
  kotrimoksazol: ["sulfonamide"],
  aspirin: ["salicylate", "nsaid"],
  asetosal: ["salicylate", "nsaid"],
  salisilat: ["salicylate"],
  nsaid: ["nsaid"],
  oains: ["nsaid"],
  ibuprofen: ["nsaid"],
  parasetamol: ["paracetamol", "acetaminophen"],
  paracetamol: ["paracetamol", "acetaminophen"],
  asetaminofen: ["paracetamol", "acetaminophen"],
  insulin: ["insulin"],
  opioid: ["opioid"],
  opiat: ["opioid"],
  morfin: ["opioid"],
};

const norm = (s: string): string => s.toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "");

function classify(medicationName: string): DrugFact | undefined {
  const n = norm(medicationName);
  return DRUG_FACTS.find((f) => n.includes(f.match));
}

function pairMatches(rule: InteractionRule, x: DrugFact, y: DrugFact): boolean {
  const has = (d: DrugFact, c: string) => d.classes.includes(c);
  return (has(x, rule.a) && has(y, rule.b)) || (has(x, rule.b) && has(y, rule.a));
}

const SEVERITY_RANK: Record<AlertSeverity, number> = { high: 0, moderate: 1, info: 2 };

/**
 * Screen one prospective prescription against the patient's allergies and their
 * currently active medications. Returns alerts ordered most-severe first.
 */
export function screenPrescription(input: {
  drugName: string;
  patientAllergies: string[];
  activeDrugNames: string[];
}): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];
  const drug = classify(input.drugName);
  const drugNorm = norm(input.drugName);

  // 1) Allergy — expand the documented allergen via synonyms (incl. Indonesian
  //    spelling) and match against the drug's name, ingredients or pharmacologic
  //    class (cross-sensitivity, e.g. penicillin ⇒ amoxicillin).
  const drugSig = new Set<string>([drugNorm, ...(drug?.ingredients ?? []), ...(drug?.classes ?? [])]);
  for (const raw of input.patientAllergies) {
    const tok = norm(raw);
    if (!tok) continue;
    const candidates = [tok, ...(ALLERGEN_SYNONYMS[tok] ?? [])];
    const hits = candidates.some(
      (c) =>
        drugSig.has(c) ||
        drugNorm.includes(c) ||
        (!!drug && drug.ingredients.some((i) => i.includes(c) || c.includes(i))),
    );
    if (hits) {
      alerts.push({
        kind: "allergy",
        severity: "high",
        message: `Alergi terdokumentasi "${raw}" — ${drug?.name ?? input.drugName} berpotensi reaksi silang.`,
      });
    }
  }

  // 2) Duplicate therapy — same ingredient already active.
  // 3) Interaction — class pair against each active drug.
  if (drug) {
    for (const activeName of input.activeDrugNames) {
      const active = classify(activeName);
      if (!active) continue;
      if (active.name === drug.name) {
        alerts.push({
          kind: "duplicate",
          severity: "moderate",
          message: `Duplikasi terapi: ${drug.name} sudah aktif untuk pasien ini.`,
        });
      }
      for (const rule of INTERACTIONS) {
        if (pairMatches(rule, drug, active)) {
          alerts.push({
            kind: "interaction",
            severity: rule.severity,
            message: `Interaksi ${drug.name} + ${active.name}: ${rule.note}`,
          });
        }
      }
    }
  }

  // De-duplicate identical messages, then sort by severity.
  const seen = new Set<string>();
  return alerts
    .filter((a) => (seen.has(a.message) ? false : seen.add(a.message)))
    .sort((x, y) => SEVERITY_RANK[x.severity] - SEVERITY_RANK[y.severity]);
}

/** Whether any alert is severe enough to require an explicit override reason. */
export function requiresOverride(alerts: SafetyAlert[]): boolean {
  return alerts.some((a) => a.severity === "high");
}

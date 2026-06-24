/**
 * Weight-based paediatric dosing (Domain B / CDS) — client-safe & pure. Given a drug's per-kg
 * dose and a child's weight, compute the per-dose and per-day amount, capping at the adult
 * maximum so the calculator can never recommend an over-dose. The reference values here are
 * ILLUSTRATIVE (not a substitute for an authoritative formulary) — the same disclaimer the
 * INA-CBG grouper carries. Deterministic; shared by the preview, the server, and the tests.
 */
export interface PedsDrug {
  code: string;
  name: string;
  mgPerKgPerDose: number;
  maxMgPerDose: number;
  frequencyPerDay: number;
  maxMgPerDay: number;
  route: string;
}

/** Illustrative catalogue of common paediatric drugs (verify against an official source). */
export const PEDS_DRUGS: PedsDrug[] = [
  { code: "paracetamol", name: "Parasetamol", mgPerKgPerDose: 15, maxMgPerDose: 1000, frequencyPerDay: 4, maxMgPerDay: 4000, route: "Oral" },
  { code: "ibuprofen", name: "Ibuprofen", mgPerKgPerDose: 10, maxMgPerDose: 400, frequencyPerDay: 3, maxMgPerDay: 1200, route: "Oral" },
  { code: "amoxicillin", name: "Amoksisilin", mgPerKgPerDose: 25, maxMgPerDose: 500, frequencyPerDay: 3, maxMgPerDay: 1500, route: "Oral" },
  { code: "cefixime", name: "Sefiksim", mgPerKgPerDose: 4, maxMgPerDose: 200, frequencyPerDay: 2, maxMgPerDay: 400, route: "Oral" },
  { code: "domperidone", name: "Domperidon", mgPerKgPerDose: 0.25, maxMgPerDose: 10, frequencyPerDay: 3, maxMgPerDay: 30, route: "Oral" },
  { code: "ondansetron", name: "Ondansetron", mgPerKgPerDose: 0.15, maxMgPerDose: 4, frequencyPerDay: 3, maxMgPerDay: 12, route: "IV/Oral" },
];

export function drugByCode(code: string): PedsDrug | undefined {
  return PEDS_DRUGS.find((d) => d.code === code);
}
export function isDrugCode(code: string): boolean {
  return PEDS_DRUGS.some((d) => d.code === code);
}

/** A weight is valid when it is a finite, positive value within a paediatric range (≤ 100 kg). */
export function isValidWeight(weightKg: number): boolean {
  return Number.isFinite(weightKg) && weightKg > 0 && weightKg <= 100;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export interface DoseResult {
  perDose: number;       // mg per administration (capped at maxMgPerDose)
  perDoseCapped: boolean; // weight-based dose exceeded the per-dose ceiling
  perDay: number;        // mg per day (capped at maxMgPerDay)
  perDayCapped: boolean;
  frequencyPerDay: number;
}

/**
 * Compute the dose for a drug and weight. Both the per-dose and per-day amounts are clamped to
 * the drug's adult maximum; a `capped` flag flags when the weight-based figure was reduced.
 */
export function doseFor(drug: PedsDrug, weightKg: number): DoseResult {
  const rawPerDose = round1(weightKg * drug.mgPerKgPerDose);
  const perDose = Math.min(rawPerDose, drug.maxMgPerDose);
  const rawPerDay = round1(perDose * drug.frequencyPerDay);
  const perDay = Math.min(rawPerDay, drug.maxMgPerDay);
  return {
    perDose,
    perDoseCapped: rawPerDose > drug.maxMgPerDose,
    perDay,
    perDayCapped: rawPerDay > drug.maxMgPerDay,
    frequencyPerDay: drug.frequencyPerDay,
  };
}

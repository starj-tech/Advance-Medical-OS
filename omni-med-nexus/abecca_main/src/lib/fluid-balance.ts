/**
 * Fluid balance / intake–output (Domain E) — client-safe & pure. Each entry is a measured
 * volume in one direction (intake or output); the net balance over a set of entries is total
 * intake minus total output. The helpers tally a patient's chart and band the running balance.
 * No state, no I/O.
 */
export type FluidDirection = "intake" | "output";

export const INTAKE_TYPES = [
  { v: "oral", t: "Oral / minum" },
  { v: "iv", t: "Cairan IV / infus" },
  { v: "transfusion", t: "Transfusi" },
  { v: "enteral", t: "Enteral / NGT" },
] as const;
export const OUTPUT_TYPES = [
  { v: "urine", t: "Urin" },
  { v: "vomit", t: "Muntah" },
  { v: "drain", t: "Drain" },
  { v: "feces", t: "Feses / BAB" },
  { v: "bleeding", t: "Perdarahan" },
] as const;

const INTAKE_SET = new Set(INTAKE_TYPES.map((t) => t.v));
const OUTPUT_SET = new Set(OUTPUT_TYPES.map((t) => t.v));

/** Whether `type` is a valid category for the given direction. */
export function isValidType(direction: FluidDirection, type: string): boolean {
  return direction === "intake" ? INTAKE_SET.has(type as never) : OUTPUT_SET.has(type as never);
}

/** Human label for a fluid type (falls back to the raw code). */
export function fluidTypeLabel(type: string): string {
  return [...INTAKE_TYPES, ...OUTPUT_TYPES].find((t) => t.v === type)?.t ?? type;
}

/** A volume is valid when it is a positive integer (millilitres), capped to a sane bound. */
export function isValidVolume(volumeMl: number): boolean {
  return Number.isInteger(volumeMl) && volumeMl > 0 && volumeMl <= 100_000;
}

type FluidLike = { direction: FluidDirection; volumeMl: number };

export function totalIntake(entries: FluidLike[]): number {
  return entries.filter((e) => e.direction === "intake").reduce((s, e) => s + e.volumeMl, 0);
}
export function totalOutput(entries: FluidLike[]): number {
  return entries.filter((e) => e.direction === "output").reduce((s, e) => s + e.volumeMl, 0);
}
/** Net balance = total intake − total output (positive = net gain/retention). */
export function netBalance(entries: FluidLike[]): number {
  return totalIntake(entries) - totalOutput(entries);
}

export type BalanceStatus = "positive" | "neutral" | "negative";
/** Band the net balance by sign: positive (retensi), neutral (seimbang), negative (defisit). */
export function balanceStatus(net: number): BalanceStatus {
  if (net > 0) return "positive";
  if (net < 0) return "negative";
  return "neutral";
}
export const BALANCE_LABEL: Record<BalanceStatus, string> = {
  positive: "Balans positif", neutral: "Seimbang", negative: "Balans negatif",
};
export const BALANCE_VARIANT: Record<BalanceStatus, "info" | "success" | "warning"> = {
  positive: "info", neutral: "success", negative: "warning",
};

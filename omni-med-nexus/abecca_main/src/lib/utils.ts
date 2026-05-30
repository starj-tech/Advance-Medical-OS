import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AcuityLevel } from "./types";

/** Tailwind-aware className combiner used by every UI primitive. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an integer amount of Indonesian Rupiah (tariffs are stored in IDR). */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Compact number formatting for stock counts and metrics. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Human date, e.g. "5 Jan 2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Human date + time, e.g. "5 Jan 2026, 14:30". */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Relative time from now, e.g. "3h ago" — used in the audit feed. */
export function timeAgo(input: string | number): string {
  const then = typeof input === "number" ? input * 1000 : new Date(input).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, unitSeconds] of units) {
    if (seconds >= unitSeconds || unit === "second") {
      return rtf.format(-Math.round(seconds / unitSeconds), unit);
    }
  }
  return rtf.format(0, "second");
}

/** Shorten a SHA-256 hash for display, e.g. "a1b2c3d4…9f0e". */
export function shortHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}

/** Map an Early Warning Score to a clinical acuity band (NEWS-style thresholds). */
export function acuityFromEws(ews: number): AcuityLevel {
  if (ews >= 7) return "critical";
  if (ews >= 5) return "guarded";
  return "stable";
}

/** Presentation tokens for each acuity level (kept declarative for reuse). */
export const acuityMeta: Record<
  AcuityLevel,
  { label: string; dot: string; text: string; bg: string; ring: string }
> = {
  stable: {
    label: "Stable",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    ring: "ring-emerald-500/20",
  },
  guarded: {
    label: "Guarded",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    ring: "ring-amber-500/20",
  },
  critical: {
    label: "Critical",
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    ring: "ring-rose-500/20",
  },
};

/** Initials for an avatar fallback. */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

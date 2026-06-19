/**
 * i18n + locale-aware formatting core — client-safe, dependency-free (pure `Intl`).
 * The platform is multi-tenant across countries, so currency and locale are explicit
 * inputs rather than hardcoded to IDR/id-ID. `formatMoney` is the single money
 * formatter (utils.formatIDR now delegates here). Locale is carried in a cookie and
 * resolved server-side; messages live in `@/lib/messages`. No imports.
 */
export type Locale = "id" | "en";

export const LOCALES: Locale[] = ["id", "en"];
export const DEFAULT_LOCALE: Locale = "id";
export const LOCALE_COOKIE = "abecca_locale";

export const LOCALE_LABEL: Record<Locale, string> = {
  id: "Bahasa Indonesia",
  en: "English",
};
/** BCP-47 tag passed to Intl for each app locale. */
export const LOCALE_INTL: Record<Locale, string> = {
  id: "id-ID",
  en: "en-US",
};

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as string[]).includes(v);
}
/** Coerce an unknown (e.g. a cookie value) to a supported locale. */
export function resolveLocale(v: unknown): Locale {
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export type Currency =
  | "IDR" | "USD" | "EUR" | "GBP" | "SGD" | "AUD" | "MYR" | "JPY" | "SAR" | "AED";

/** A sensible default billing currency per locale (tenants can override). */
export const LOCALE_DEFAULT_CURRENCY: Record<Locale, Currency> = {
  id: "IDR",
  en: "USD",
};

/** Currencies with no minor unit — rendered without decimals. */
const ZERO_DECIMAL: ReadonlySet<Currency> = new Set<Currency>(["IDR", "JPY"]);

/**
 * Format a monetary amount for a locale + currency. Decimal places follow the
 * currency (0 for IDR/JPY, else 2) unless `fractionDigits` is given.
 */
export function formatMoney(
  amount: number,
  opts: { locale?: Locale; currency?: Currency; fractionDigits?: number } = {},
): string {
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const currency = opts.currency ?? LOCALE_DEFAULT_CURRENCY[locale];
  const digits = opts.fractionDigits ?? (ZERO_DECIMAL.has(currency) ? 0 : 2);
  return new Intl.NumberFormat(LOCALE_INTL[locale], {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

/** Locale-aware plain number formatting. */
export function formatNumberLocale(value: number, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(LOCALE_INTL[locale]).format(value);
}

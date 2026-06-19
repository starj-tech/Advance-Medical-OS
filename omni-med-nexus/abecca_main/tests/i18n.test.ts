import { describe, it, expect } from "vitest";
import {
  formatMoney, formatNumberLocale, isLocale, resolveLocale,
  LOCALES, DEFAULT_LOCALE, LOCALE_DEFAULT_CURRENCY,
} from "@/lib/i18n";
import { MESSAGES } from "@/lib/messages";
import { formatIDR } from "@/lib/utils";

describe("i18n: locale resolution", () => {
  it("recognises supported locales only", () => {
    expect(isLocale("id")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("xx")).toBe(false);
    expect(isLocale(42)).toBe(false);
  });
  it("falls back to the default locale", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("zz")).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(DEFAULT_LOCALE).toBe("id");
  });
});

describe("i18n: money formatting (locale + currency)", () => {
  it("formats IDR with no decimals (id grouping)", () => {
    const s = formatMoney(5000, { currency: "IDR", locale: "id" });
    expect(s).toMatch(/Rp/);
    expect(s).toMatch(/5\.000/);
    expect(s).not.toMatch(/,\d{2}$/); // no minor units
  });
  it("formats USD with two decimals (en grouping)", () => {
    expect(formatMoney(1234.5, { currency: "USD", locale: "en" })).toMatch(/\$1,234\.50/);
  });
  it("treats JPY as zero-decimal", () => {
    const s = formatMoney(1000, { currency: "JPY", locale: "en" });
    expect(s).toMatch(/1,000/);
    expect(s).not.toMatch(/\.00/);
  });
  it("defaults currency from locale", () => {
    expect(LOCALE_DEFAULT_CURRENCY.id).toBe("IDR");
    expect(LOCALE_DEFAULT_CURRENCY.en).toBe("USD");
    expect(formatMoney(1000)).toMatch(/Rp/); // default locale id -> IDR
  });
  it("formatIDR delegates to formatMoney (backward compatible)", () => {
    expect(formatIDR(5000)).toBe(formatMoney(5000, { currency: "IDR", locale: "id" }));
  });
  it("formats numbers per locale", () => {
    expect(formatNumberLocale(1234567, "en")).toBe("1,234,567");
    expect(formatNumberLocale(1234567, "id")).toBe("1.234.567");
  });
});

// Recursively collect dotted key paths so missing translations fail loudly.
function keyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === "object" ? keyPaths(v as Record<string, unknown>, path) : [path];
  });
}

describe("i18n: catalogue parity", () => {
  it("every locale defines exactly the same keys", () => {
    const reference = keyPaths(MESSAGES[DEFAULT_LOCALE] as unknown as Record<string, unknown>).sort();
    expect(reference.length).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      const keys = keyPaths(MESSAGES[locale] as unknown as Record<string, unknown>).sort();
      expect(keys).toEqual(reference);
    }
  });
  it("no message value is empty", () => {
    for (const locale of LOCALES) {
      const flat = JSON.stringify(MESSAGES[locale]);
      expect(flat).not.toMatch(/":\s*""/);
    }
  });
});

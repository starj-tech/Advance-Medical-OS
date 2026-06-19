"use client";

import { Languages } from "lucide-react";
import { LOCALES, LOCALE_LABEL, type Locale } from "@/lib/i18n";
import { useLocale, useSetLocale, useT } from "./i18n-provider";

export function LanguageSwitcher() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const t = useT("shell");

  return (
    <label className="relative flex items-center" title={t("language")}>
      <Languages className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t("language")}
        className="h-9 appearance-none rounded-lg border border-border bg-surface pl-8 pr-7 text-sm outline-none transition-colors hover:bg-foreground/5 focus:border-primary focus:ring-2 focus:ring-primary/30"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>{LOCALE_LABEL[l]}</option>
        ))}
      </select>
    </label>
  );
}

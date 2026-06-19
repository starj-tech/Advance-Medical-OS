"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { type Locale, LOCALE_COOKIE } from "@/lib/i18n";
import type { Messages } from "@/lib/messages";

interface I18nContextValue {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Carries the active locale + its messages (resolved server-side from the cookie and
 * passed in by the layout). `setLocale` persists the choice and refreshes so the server
 * re-renders with the new catalogue. Also mirrors the locale onto `<html lang>`.
 */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      messages,
      setLocale: (next) => {
        document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
        router.refresh();
      },
    }),
    [locale, messages, router],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

export function useLocale(): Locale {
  return useI18n().locale;
}

export function useSetLocale(): (locale: Locale) => void {
  return useI18n().setLocale;
}

/** Namespace-scoped translator: `const t = useT("nav"); t("dashboard")`. */
export function useT<NS extends keyof Messages>(ns: NS): (key: keyof Messages[NS]) => string {
  const { messages } = useI18n();
  return (key) => {
    const value = (messages[ns] as Record<string, string>)[key as string];
    return value ?? String(key);
  };
}

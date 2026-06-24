import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/app-shell";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n";
import { MESSAGES } from "@/lib/messages";

export const metadata: Metadata = {
  title: "Clinical Portal",
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const locale = resolveLocale(store.get(LOCALE_COOKIE)?.value);

  return (
    <I18nProvider locale={locale} messages={MESSAGES[locale]}>
      <AppShell>{children}</AppShell>
    </I18nProvider>
  );
}

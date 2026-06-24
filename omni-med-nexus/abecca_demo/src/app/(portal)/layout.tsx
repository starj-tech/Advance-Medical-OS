import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/app-shell";
import { ensureDemoSeed } from "@/server/demo-seed";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n";
import { MESSAGES } from "@/lib/messages";

export const metadata: Metadata = {
  title: "Coba Abecca — Demo",
};

// Render per-request so the in-memory demo seed runs in the live serverless
// process (not just at build time) and the dashboard/beds are populated.
export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Populate the in-memory demo tenant before any portal page renders.
  await ensureDemoSeed();
  const store = await cookies();
  const locale = resolveLocale(store.get(LOCALE_COOKIE)?.value);
  return (
    <I18nProvider locale={locale} messages={MESSAGES[locale]}>
      <AppShell>{children}</AppShell>
    </I18nProvider>
  );
}

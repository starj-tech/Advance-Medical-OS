"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { SidebarBrand, SidebarNav } from "./sidebar";
import { Topbar } from "./topbar";
import type { Messages } from "@/lib/messages";
import { useT } from "@/components/i18n/i18n-provider";

// Page title reuses the nav translation keys so titles localise with the sidebar.
const titleKeys: Record<string, keyof Messages["nav"]> = {
  "/dashboard": "dashboard",
  "/analytics": "analytics",
  "/copilot": "copilot",
  "/registration": "registration",
  "/emergency": "emergency",
  "/appointments": "appointments",
  "/telemedicine": "telemedicine",
  "/patients": "patients",
  "/beds": "beds",
  "/surgery": "surgery",
  "/diagnostics": "diagnostics",
  "/imaging": "imaging",
  "/special-care": "specialCare",
  "/forms": "forms",
  "/devices": "devices",
  "/biomedical": "biomedical",
  "/helpdesk": "helpdesk",
  "/contracts": "contracts",
  "/formulary": "formulary",
  "/pharmacy": "pharmacy",
  "/inventory": "inventory",
  "/procurement": "procurement",
  "/stock-take": "stockTake",
  "/tariffs": "tariffs",
  "/payers": "payers",
  "/safety": "safety",
  "/risk-register": "riskRegister",
  "/consent": "consent",
  "/complaints": "complaints",
  "/feedback": "feedback",
  "/infection-control": "infectionControl",
  "/antimicrobial": "antimicrobial",
  "/quality-indicators": "qualityIndicators",
  "/credentials": "credentials",
  "/staff": "staffDirectory",
  "/privileging": "privileging",
  "/roster": "roster",
  "/audit": "audit",
  "/observability": "observability",
  "/integrations": "integrations",
  "/security": "security",
};

function navKeyFor(pathname: string): keyof Messages["nav"] | null {
  const key = Object.keys(titleKeys).find(
    (k) => pathname === k || pathname.startsWith(`${k}/`),
  );
  return key ? titleKeys[key] : null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const tNav = useT("nav");
  const tShell = useT("shell");

  const navKey = navKeyFor(pathname);
  const title = pathname.startsWith("/patients/")
    ? tShell("patientRecord")
    : navKey
      ? tNav(navKey)
      : "Abecca";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <SidebarBrand />
        <SidebarNav />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-surface shadow-xl animate-fade-in">
            <div className="flex items-center justify-between pr-3">
              <SidebarBrand />
              <button
                type="button"
                aria-label={tShell("closeMenu")}
                onClick={() => setMobileOpen(false)}
                className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/5"
              >
                <X className="size-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { SidebarBrand, SidebarNav } from "./sidebar";
import { Topbar } from "./topbar";
import { DemoBanner } from "@/components/demo/demo-banner";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/analytics": "Analitik Eksekutif",
  "/copilot": "Abecca Copilot",
  "/registration": "Pendaftaran & Antrian",
  "/appointments": "Janji Temu",
  "/telemedicine": "Telemedicine",
  "/patients": "Patients",
  "/beds": "Bed Board",
  "/surgery": "Jadwal Operasi",
  "/diagnostics": "Worklist Lab & Radiologi",
  "/imaging": "Imaging / PACS",
  "/special-care": "Unit Khusus",
  "/forms": "Form Dinamis",
  "/devices": "Devices",
  "/formulary": "Formulary",
  "/pharmacy": "Dispensing Farmasi",
  "/tariffs": "Tariffs",
  "/safety": "Keselamatan Pasien",
  "/audit": "Audit Trail",
  "/observability": "Observability",
};

function titleFor(pathname: string): string {
  if (pathname.startsWith("/patients/")) return "Patient Record";
  const key = Object.keys(titles).find(
    (k) => pathname === k || pathname.startsWith(`${k}/`),
  );
  return key ? titles[key] : "Abecca";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

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
                aria-label="Close menu"
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
        <DemoBanner />
        <Topbar title={titleFor(pathname)} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

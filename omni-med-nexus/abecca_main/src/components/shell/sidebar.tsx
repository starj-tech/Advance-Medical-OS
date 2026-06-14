"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BedDouble,
  CalendarClock,
  ClipboardList,
  FileText,
  FlaskConical,
  Gauge,
  HeartPulse,
  Images,
  KeyRound,
  LayoutDashboard,
  PackageCheck,
  Pill,
  Radio,
  Receipt,
  Scissors,
  Sparkles,
  ShieldAlert,
  Video,
  ShieldCheck,
  Users,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analitik", icon: BarChart3 },
  { href: "/copilot", label: "Copilot", icon: Sparkles },
  { href: "/registration", label: "Pendaftaran", icon: ClipboardList },
  { href: "/appointments", label: "Janji Temu", icon: CalendarClock },
  { href: "/telemedicine", label: "Telemedicine", icon: Video },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/beds", label: "Bed Board", icon: BedDouble },
  { href: "/surgery", label: "Operasi", icon: Scissors },
  { href: "/diagnostics", label: "Lab & Radiologi", icon: FlaskConical },
  { href: "/imaging", label: "Imaging / PACS", icon: Images },
  { href: "/special-care", label: "Unit Khusus", icon: HeartPulse },
  { href: "/forms", label: "Form Dinamis", icon: FileText },
  { href: "/devices", label: "Devices", icon: Radio },
  { href: "/formulary", label: "Formulary", icon: Pill },
  { href: "/pharmacy", label: "Farmasi", icon: PackageCheck },
  { href: "/tariffs", label: "Tariffs", icon: Receipt },
  { href: "/safety", label: "Keselamatan", icon: ShieldAlert },
  { href: "/audit", label: "Audit Trail", icon: ShieldCheck },
  { href: "/observability", label: "Observability", icon: Gauge },
  { href: "/integrations", label: "Integrasi", icon: Webhook },
  { href: "/security", label: "Keamanan Akun", icon: KeyRound },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Clinical
      </p>
      {nav.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0",
                active
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
              strokeWidth={2}
            />
            {item.label}
          </Link>
        );
      })}

      <div className="mt-auto px-3 pt-4">
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
          <Activity className="size-4 text-primary" />
          <span>Core engine: library mode</span>
        </div>
      </div>
    </nav>
  );
}

export function SidebarBrand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-4">
      <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
        <span className="text-lg font-bold">A</span>
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold tracking-tight">Abecca</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Clinical Portal
        </span>
      </span>
    </Link>
  );
}

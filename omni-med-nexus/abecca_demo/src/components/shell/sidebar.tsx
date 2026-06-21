"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  BedDouble,
  Boxes,
  Bug,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Contact,
  FileSignature,
  FileText,
  FlaskConical,
  Gauge,
  HeartPulse,
  Images,
  Landmark,
  LayoutDashboard,
  MessageSquareWarning,
  PackageCheck,
  Pill,
  Radar,
  Radio,
  Receipt,
  Scissors,
  ShoppingCart,
  Siren,
  Sparkles,
  Star,
  Stethoscope,
  Tablets,
  Target,
  ShieldAlert,
  ShieldCheck,
  Users,
  Video,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Messages } from "@/lib/messages";
import { useT } from "@/components/i18n/i18n-provider";

const nav: { href: string; key: keyof Messages["nav"]; icon: typeof LayoutDashboard }[] = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/analytics", key: "analytics", icon: BarChart3 },
  { href: "/copilot", key: "copilot", icon: Sparkles },
  { href: "/registration", key: "registration", icon: ClipboardList },
  { href: "/emergency", key: "emergency", icon: Siren },
  { href: "/appointments", key: "appointments", icon: CalendarClock },
  { href: "/telemedicine", key: "telemedicine", icon: Video },
  { href: "/patients", key: "patients", icon: Users },
  { href: "/beds", key: "beds", icon: BedDouble },
  { href: "/surgery", key: "surgery", icon: Scissors },
  { href: "/diagnostics", key: "diagnostics", icon: FlaskConical },
  { href: "/imaging", key: "imaging", icon: Images },
  { href: "/special-care", key: "specialCare", icon: HeartPulse },
  { href: "/forms", key: "forms", icon: FileText },
  { href: "/devices", key: "devices", icon: Radio },
  { href: "/formulary", key: "formulary", icon: Pill },
  { href: "/pharmacy", key: "pharmacy", icon: PackageCheck },
  { href: "/inventory", key: "inventory", icon: Boxes },
  { href: "/procurement", key: "procurement", icon: ShoppingCart },
  { href: "/stock-take", key: "stockTake", icon: ClipboardCheck },
  { href: "/tariffs", key: "tariffs", icon: Receipt },
  { href: "/payers", key: "payers", icon: Landmark },
  { href: "/safety", key: "safety", icon: ShieldAlert },
  { href: "/risk-register", key: "riskRegister", icon: Radar },
  { href: "/consent", key: "consent", icon: FileSignature },
  { href: "/complaints", key: "complaints", icon: MessageSquareWarning },
  { href: "/feedback", key: "feedback", icon: Star },
  { href: "/infection-control", key: "infectionControl", icon: Bug },
  { href: "/antimicrobial", key: "antimicrobial", icon: Tablets },
  { href: "/quality-indicators", key: "qualityIndicators", icon: Target },
  { href: "/credentials", key: "credentials", icon: BadgeCheck },
  { href: "/staff", key: "staffDirectory", icon: Contact },
  { href: "/privileging", key: "privileging", icon: Stethoscope },
  { href: "/audit", key: "audit", icon: ShieldCheck },
  { href: "/observability", key: "observability", icon: Gauge },
  { href: "/integrations", key: "integrations", icon: Webhook },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useT("nav");
  const tShell = useT("shell");

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {tShell("clinical")}
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
            {t(item.key)}
          </Link>
        );
      })}

      <div className="mt-auto px-3 pt-4">
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
          <Activity className="size-4 text-primary" />
          <span>{tShell("coreEngine")}</span>
        </div>
      </div>
    </nav>
  );
}

export function SidebarBrand() {
  const tShell = useT("shell");
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-4">
      <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
        <span className="text-lg font-bold">A</span>
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold tracking-tight">Abecca</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {tShell("brandTagline")}
        </span>
      </span>
    </Link>
  );
}

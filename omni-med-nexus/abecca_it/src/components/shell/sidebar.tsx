"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ListTree, Radio, ServerCog, ShieldAlert, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/overview", label: "System Overview", icon: Activity },
  { href: "/services", label: "Services", icon: ServerCog },
  { href: "/fleet", label: "Device Fleet", icon: Radio },
  { href: "/incidents", label: "Incidents", icon: ShieldAlert },
  { href: "/security", label: "Security Posture", icon: ListTree },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Operations
      </p>
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
              )}
              strokeWidth={2}
            />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto px-3 pt-4">
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
          <Terminal className="size-4 text-primary" />
          <span>asia-southeast1</span>
        </div>
      </div>
    </nav>
  );
}

export function SidebarBrand() {
  return (
    <Link href="/overview" className="flex items-center gap-2.5 px-5 py-4">
      <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
        <span className="text-lg font-bold">A</span>
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold tracking-tight">Abecca</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          IT Operations
        </span>
      </span>
    </Link>
  );
}

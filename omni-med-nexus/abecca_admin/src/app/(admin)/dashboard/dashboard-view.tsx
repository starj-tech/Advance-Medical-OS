"use client";

import Link from "next/link";
import {
  BedDouble,
  ChevronRight,
  Pill,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { invoiceTotal } from "@/lib/data";
import { useAdminOverview, useInvoices, useWards } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { cn, formatIDR, occupancyTone } from "@/lib/utils";

const statusVariant = {
  paid: "success",
  pending: "warning",
  overdue: "danger",
} as const;

const toneBar = { ok: "bg-emerald-500", warning: "bg-amber-500", danger: "bg-rose-500" };

export function DashboardView() {
  const overview = useAdminOverview();
  const invoices = useInvoices();
  const wards = useWards();
  const recentInvoices = [...invoices]
    .sort((a, b) => +new Date(b.issuedAt) - +new Date(a.issuedAt))
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Bed Occupancy"
          value={`${Math.round(overview.occupancyRate * 100)}%`}
          icon={BedDouble}
          hint={`${overview.occupied}/${overview.totalBeds} beds`}
          tone={overview.occupancyRate >= 0.9 ? "danger" : "default"}
        />
        <StatCard
          label="Revenue (paid)"
          value={formatIDR(overview.revenue)}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Outstanding"
          value={formatIDR(overview.outstanding)}
          icon={Receipt}
          tone="warning"
          hint={`${overview.openInvoices} open invoices`}
        />
        <StatCard
          label="Staff On Duty"
          value={`${overview.staffOnDuty}/${overview.staffTotal}`}
          icon={Users}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ward Occupancy</CardTitle>
            <Link
              href="/wards"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              All wards <ChevronRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {wards.map((w) => {
              const rate = w.occupiedBeds / w.totalBeds;
              const tone = occupancyTone(rate);
              return (
                <div key={w.id} className="flex items-center gap-4">
                  <div className="w-32 shrink-0">
                    <p className="truncate text-sm font-medium">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.department}</p>
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", toneBar[tone])}
                      style={{ width: `${rate * 100}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-sm tabular-nums">
                    {w.occupiedBeds}/{w.totalBeds}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Alerts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link
              href="/pharmacy"
              className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-foreground/[0.02]"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Pill className="size-4" />
              </span>
              <span className="text-sm">
                <span className="font-medium">{overview.lowStock}</span> meds below
                reorder level
              </span>
              <ChevronRight className="ml-auto size-4 text-muted-foreground" />
            </Link>
            <Link
              href="/billing"
              className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-foreground/[0.02]"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Receipt className="size-4" />
              </span>
              <span className="text-sm">
                <span className="font-medium">{overview.openInvoices}</span> invoices
                awaiting payment
              </span>
              <ChevronRight className="ml-auto size-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <Link
            href="/billing"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            All billing <ChevronRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {recentInvoices.map((inv) => (
              <li key={inv.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  {inv.id}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {inv.patientName}{" "}
                  <span className="text-muted-foreground">· {inv.patientId}</span>
                </span>
                <Badge variant={statusVariant[inv.status]}>{inv.status}</Badge>
                <span className="w-28 text-right text-sm font-semibold tabular-nums">
                  {formatIDR(invoiceTotal(inv))}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

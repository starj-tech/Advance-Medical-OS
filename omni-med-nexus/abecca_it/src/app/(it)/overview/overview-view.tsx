"use client";

import Link from "next/link";
import {
  Activity,
  ChevronRight,
  Server,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useIncidents, useItOverview, useServices } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { Badge } from "@/components/ui/badge";
import { TimeAgo } from "@/components/ui/time-ago";

const severityVariant = { info: "info", warning: "warning", critical: "danger" } as const;

export function OverviewView() {
  const overview = useItOverview();
  const incidents = useIncidents();
  const services = useServices();
  const allHealthy = overview.degraded === 0 && overview.down === 0;
  const openIncidents = incidents.filter((i) => i.status !== "resolved");

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Health banner */}
      <div
        className={
          allHealthy
            ? "flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-50 px-5 py-4 dark:bg-emerald-950/30"
            : "flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-50 px-5 py-4 dark:bg-amber-950/30"
        }
      >
        <span
          className={
            allHealthy
              ? "grid size-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "grid size-10 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400"
          }
        >
          {allHealthy ? <ShieldCheck className="size-5" /> : <ShieldAlert className="size-5" />}
        </span>
        <div>
          <p className="text-sm font-semibold">
            {allHealthy ? "All systems operational" : "Partial degradation"}
          </p>
          <p className="text-xs text-muted-foreground">
            {overview.operational}/{overview.total} services operational ·{" "}
            {overview.avgUptime.toFixed(2)}% avg uptime (30d)
          </p>
        </div>
        <Badge variant={overview.openIncidents ? "warning" : "success"} className="ml-auto">
          {overview.openIncidents} open incident{overview.openIncidents === 1 ? "" : "s"}
        </Badge>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Services" value={overview.total} icon={Server} />
        <StatCard label="Operational" value={overview.operational} icon={Activity} tone="success" />
        <StatCard
          label="Degraded / Maint."
          value={overview.degraded + overview.maintenance}
          icon={ShieldAlert}
          tone="warning"
        />
        <StatCard
          label="Avg Uptime"
          value={`${overview.avgUptime.toFixed(2)}%`}
          icon={Activity}
          tone="success"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Service Health</CardTitle>
            <Link
              href="/services"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              All services <ChevronRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {services.slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.kind}</p>
                  </div>
                  <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">
                    {s.uptime}%
                  </span>
                  <StatusPill status={s.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Incidents</CardTitle>
            <Link
              href="/incidents"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              All <ChevronRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {openIncidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open incidents.</p>
            ) : (
              openIncidents.map((i) => (
                <div key={i.id} className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={severityVariant[i.severity]}>{i.severity}</Badge>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {i.id}
                    </span>
                  </div>
                  <p className="text-sm">{i.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.service} · <TimeAgo iso={i.openedAt} />
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { CircleCheck, CircleDot, Eye, RotateCcw } from "lucide-react";
import type { Incident, Severity } from "@/lib/data";
import {
  acknowledgeIncident,
  reopenIncident,
  resolveIncident,
  useIncidents,
} from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";

const severityVariant: Record<Severity, "info" | "warning" | "danger"> = {
  info: "info",
  warning: "warning",
  critical: "danger",
};

const statusIcon = { open: CircleDot, monitoring: Eye, resolved: CircleCheck };
const statusColor = {
  open: "text-rose-500",
  monitoring: "text-amber-500",
  resolved: "text-emerald-500",
};

export function IncidentsView() {
  const incidents = useIncidents();
  const open = incidents.filter((i) => i.status !== "resolved").length;
  const sorted = [...incidents].sort(
    (a, b) => +new Date(b.openedAt) - +new Date(a.openedAt),
  );

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Operational incidents across the platform, newest first. Acknowledge or
        resolve to update the live counts.
      </p>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total" value={incidents.length} icon={CircleDot} />
        <StatCard label="Open" value={open} icon={CircleDot} tone={open ? "warning" : "success"} />
        <StatCard
          label="Resolved"
          value={incidents.length - open}
          icon={CircleCheck}
          tone="success"
        />
      </section>

      <Card>
        <CardContent className="p-0">
          <ol>
            {sorted.map((inc: Incident, i) => {
              const Icon = statusIcon[inc.status];
              return (
                <li
                  key={inc.id}
                  className="flex gap-4 px-5 py-4 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border"
                >
                  <div className="flex flex-col items-center">
                    <Icon className={cn("size-5 shrink-0", statusColor[inc.status])} />
                    {i < sorted.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={severityVariant[inc.severity]}>
                        {inc.severity}
                      </Badge>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {inc.id}
                      </span>
                      <span className="ml-auto text-xs capitalize text-muted-foreground">
                        {inc.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{inc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {inc.service} · {formatDateTime(inc.openedAt)}
                    </p>

                    {/* Actions */}
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {inc.status === "open" && (
                        <Button
                          className="h-7 px-2.5 text-xs"
                          onClick={() => acknowledgeIncident(inc.id)}
                        >
                          <Eye className="size-3.5" />
                          Acknowledge
                        </Button>
                      )}
                      {inc.status !== "resolved" && (
                        <Button
                          variant="outline"
                          className="h-7 px-2.5 text-xs"
                          onClick={() => resolveIncident(inc.id)}
                        >
                          <CircleCheck className="size-3.5" />
                          Resolve
                        </Button>
                      )}
                      {inc.status === "resolved" && (
                        <Button
                          variant="ghost"
                          className="h-7 px-2.5 text-xs"
                          onClick={() => reopenIncident(inc.id)}
                        >
                          <RotateCcw className="size-3.5" />
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

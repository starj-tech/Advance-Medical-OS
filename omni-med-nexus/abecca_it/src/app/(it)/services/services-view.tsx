"use client";

import { useState } from "react";
import { RefreshCw, Server, TriangleAlert } from "lucide-react";
import type { Service } from "@/lib/data";
import {
  createIncident,
  cycleServiceStatus,
  useServices,
} from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";

// Default incident severity to raise for a given service status.
const severityForStatus = {
  operational: "info",
  maintenance: "info",
  degraded: "warning",
  down: "critical",
} as const;

export function ServicesView() {
  const services = useServices();
  const [raised, setRaised] = useState<string | null>(null);

  const groups = services.reduce<Record<string, Service[]>>((acc, s) => {
    (acc[s.kind] ??= []).push(s);
    return acc;
  }, {});

  const operational = services.filter((s) => s.status === "operational").length;
  const impaired = services.filter(
    (s) => s.status === "degraded" || s.status === "down",
  ).length;

  const raise = (s: Service) => {
    createIncident(
      s.name,
      severityForStatus[s.status],
      `${s.name} reported ${s.status}`,
    );
    setRaised(s.id);
    setTimeout(() => setRaised((r) => (r === s.id ? null : r)), 2000);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Live status, 30-day uptime and latency for every component of the stack.
        Change a status to simulate an event — the overview health updates live.
      </p>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Services" value={services.length} icon={Server} />
        <StatCard
          label="Operational"
          value={operational}
          icon={Server}
          tone="success"
        />
        <StatCard
          label="Degraded / Down"
          value={impaired}
          icon={TriangleAlert}
          tone={impaired ? "warning" : "success"}
        />
      </section>

      {Object.entries(groups).map(([kind, items]) => (
        <Card key={kind}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {kind}
              <Badge variant="muted">{items.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {items.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{s.name}</p>
                      <StatusPill status={s.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.detail}
                    </p>
                  </div>
                  <dl className="flex gap-6">
                    <div className="text-right">
                      <dd className="text-sm font-semibold tabular-nums">
                        {s.uptime}%
                      </dd>
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Uptime
                      </dt>
                    </div>
                    <div className="text-right">
                      <dd className="text-sm font-semibold tabular-nums">
                        {s.status === "maintenance" ? "—" : `${s.latencyMs}ms`}
                      </dd>
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Latency
                      </dt>
                    </div>
                  </dl>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      variant="outline"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => cycleServiceStatus(s.id)}
                    >
                      <RefreshCw className="size-3.5" />
                      Change status
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => raise(s)}
                      disabled={raised === s.id}
                    >
                      <TriangleAlert className="size-3.5" />
                      {raised === s.id ? "Raised" : "Raise incident"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

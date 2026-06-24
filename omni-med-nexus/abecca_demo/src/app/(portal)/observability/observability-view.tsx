"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, Filter, Gauge } from "lucide-react";
import type { AppEvent, EventMetrics } from "@/server/observability/log";
import { EVENT_LEVELS, EVENT_LEVEL_LABEL, type EventLevel } from "@/lib/observability";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Can } from "@/components/auth/can";

const LEVEL_VARIANT: Record<EventLevel, "muted" | "info" | "warning" | "danger"> = {
  debug: "muted", info: "info", warn: "warning", error: "danger",
};

const selectCls =
  "h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

function MetricCard({ label, value, icon: Icon, accent }: {
  label: string; value: string; icon: typeof Activity; accent?: string;
}) {
  return (
    <Card className="p-4">
      <Icon className={`size-4 ${accent ?? "text-primary"}`} />
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

export function ObservabilityView() {
  const [metrics, setMetrics] = useState<EventMetrics | null>(null);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [level, setLevel] = useState<string>("");
  const [scope, setScope] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    const res = await fetch("/api/observability/metrics");
    if (res.ok) setMetrics(await res.json());
  }, []);
  const loadEvents = useCallback(async () => {
    const qs = new URLSearchParams();
    if (level) qs.set("level", level);
    if (scope) qs.set("scope", scope);
    const res = await fetch(`/api/observability/events?${qs.toString()}`);
    setEvents(res.ok ? await res.json() : []);
    setLoading(false);
  }, [level, scope]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMetrics();
  }, [loadMetrics]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEvents();
  }, [loadEvents]);

  const scopes = metrics ? Object.keys(metrics.byScope).sort() : [];

  return (
    <Can permission="audit:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke observability.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Observability</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Log peristiwa terstruktur lintas modul — autentikasi, otorisasi, dan integrasi —
            dengan penyamaran data sensitif otomatis.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard label="Total peristiwa" value={metrics ? String(metrics.total) : "—"} icon={Activity} />
          <MetricCard
            label="Peringatan" value={metrics ? String(metrics.byLevel.warn) : "—"}
            icon={AlertTriangle} accent="text-amber-600 dark:text-amber-400"
          />
          <MetricCard
            label="Error" value={metrics ? String(metrics.byLevel.error) : "—"}
            icon={AlertTriangle} accent="text-rose-600 dark:text-rose-400"
          />
          <MetricCard
            label="Error rate" value={metrics ? `${(metrics.errorRate * 100).toFixed(1)}%` : "—"}
            icon={Gauge}
          />
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="size-4 text-primary" /> Aliran Peristiwa
            </CardTitle>
            <div className="flex items-center gap-2">
              <select className={selectCls} value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Filter level">
                <option value="">Semua level</option>
                {EVENT_LEVELS.map((l) => (
                  <option key={l} value={l}>{EVENT_LEVEL_LABEL[l]}</option>
                ))}
              </select>
              <select className={selectCls} value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Filter scope">
                <option value="">Semua scope</option>
                {scopes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Memuat…</p>
            ) : events.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                Belum ada peristiwa yang cocok.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {events.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                    <Badge variant={LEVEL_VARIANT[e.level]}>{EVENT_LEVEL_LABEL[e.level]}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-mono text-xs text-muted-foreground">{e.scope}</span>
                        {" · "}{e.message}
                      </p>
                      {Object.keys(e.fields).length > 0 && (
                        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                          {JSON.stringify(e.fields)}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </Can>
  );
}

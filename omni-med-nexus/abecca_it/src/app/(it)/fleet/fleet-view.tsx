"use client";

import { useEffect, useState } from "react";
import { Activity, Bluetooth, Cable, Radio, RefreshCw } from "lucide-react";
import type { FleetDevice, DeviceStatus } from "@/lib/fleet";
import { fetchFleet, seedFleet, transportLabel } from "@/lib/fleet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { cn, timeAgo } from "@/lib/utils";

const statusMeta: Record<
  DeviceStatus,
  { label: string; dot: string; text: string; variant: "success" | "warning" | "danger" | "muted" | "info" }
> = {
  streaming: { label: "Streaming", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", variant: "success" },
  connecting: { label: "Connecting", dot: "bg-sky-500", text: "text-sky-600 dark:text-sky-400", variant: "info" },
  idle: { label: "Idle", dot: "bg-muted-foreground/50", text: "text-muted-foreground", variant: "muted" },
  resetting: { label: "Resetting", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", variant: "warning" },
  disconnected: { label: "Disconnected", dot: "bg-muted-foreground/50", text: "text-muted-foreground", variant: "muted" },
  error: { label: "Error", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", variant: "danger" },
};

const transportIcon = {
  "web-serial": Cable,
  "web-bluetooth": Bluetooth,
  simulator: Activity,
  gateway: Radio,
} as const;

export function FleetView() {
  const [devices, setDevices] = useState<FleetDevice[]>(seedFleet);
  const [refreshedAt, setRefreshedAt] = useState<string>("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      const fleet = await fetchFleet();
      if (active) {
        setDevices(fleet);
        setRefreshedAt(new Date().toISOString());
      }
    };
    void load();
    const timer = setInterval(load, 5000); // poll device health every 5s
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const streaming = devices.filter((d) => d.status === "streaming").length;
  const impaired = devices.filter(
    (d) => d.status === "error" || d.status === "resetting" || d.status === "disconnected",
  ).length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Read-only health view of the medical-device fleet integrated by the
        clinical portal. Connection and control live in abecca_main; IT monitors.
      </p>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Devices" value={devices.length} icon={Radio} />
        <StatCard label="Streaming" value={streaming} icon={Activity} tone="success" />
        <StatCard
          label="Needs Attention"
          value={impaired}
          icon={Radio}
          tone={impaired ? "warning" : "success"}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Device Fleet</CardTitle>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="size-3.5" />
            {refreshedAt ? `Updated ${timeAgo(refreshedAt)}` : "Polling…"}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {devices.map((d) => {
              const meta = statusMeta[d.status];
              const TIcon = transportIcon[d.transport];
              return (
                <li key={d.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className={cn("size-2 shrink-0 rounded-full", meta.dot, d.status === "streaming" && "animate-pulse-ring")} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{d.label}</p>
                    <p className="font-mono text-xs text-muted-foreground">{d.id}</p>
                  </div>
                  <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
                    <TIcon className="size-3.5" />
                    {transportLabel(d.transport)}
                  </span>
                  {d.patientId && (
                    <Badge variant="info" className="hidden md:inline-flex">
                      {d.patientId}
                    </Badge>
                  )}
                  <span className="hidden w-20 text-right text-xs text-muted-foreground md:block">
                    {d.lastSeen ? timeAgo(d.lastSeen) : "—"}
                  </span>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

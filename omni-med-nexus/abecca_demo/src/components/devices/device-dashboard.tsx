"use client";

import { Bluetooth, Cable, CircleStop, Play, Radio } from "lucide-react";
import type { Device } from "@/lib/types-devices";
import type { DriverDescriptor, TransportKind } from "@/lib/devices/types";
import { capabilities } from "@/lib/devices/transport";
import { connect, disconnect, useLatestReading, useReadingHistory } from "@/lib/devices/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeviceStatusPill } from "./device-status-pill";
import { MetricGrid } from "./metric-grid";
import { Waveform } from "./waveform";

const transportLabel: Record<TransportKind, string> = {
  "web-serial": "Web Serial",
  "web-bluetooth": "Bluetooth",
  simulator: "Simulator",
  gateway: "Gateway",
};

/**
 * Renders the dashboard for one connected device. The layout is chosen by the
 * driver's `dashboard` field — this is how every kind of hardware gets its own
 * purpose-built UI without a bespoke page per device.
 */
export function DeviceDashboard({
  device,
  driver,
}: {
  device: Device;
  driver: DriverDescriptor;
}) {
  const latest = useLatestReading(device.id);
  const history = useReadingHistory(device.id);
  const live = device.status === "streaming";

  const canSerial = capabilities.webSerial();
  const canBle = capabilities.webBluetooth();

  const connectVia = (k: "web-serial" | "web-bluetooth" | "simulator") =>
    void connect(device.id, k);

  return (
    <div className="flex flex-col gap-6">
      {/* Connection controls */}
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <DeviceStatusPill status={device.status} />
            <span className="text-sm text-muted-foreground">
              via {transportLabel[device.transport]}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {driver.transports.includes("web-serial") && (
              <Button
                variant="outline"
                className="h-9 px-3 text-xs"
                onClick={() => connectVia("web-serial")}
                disabled={!canSerial}
                title={canSerial ? "Connect a serial/USB device" : "Web Serial needs Chrome/Edge"}
              >
                <Cable className="size-4" />
                Connect Serial
              </Button>
            )}
            {driver.transports.includes("web-bluetooth") && (
              <Button
                variant="outline"
                className="h-9 px-3 text-xs"
                onClick={() => connectVia("web-bluetooth")}
                disabled={!canBle}
                title={canBle ? "Pair a Bluetooth device" : "Web Bluetooth needs Chrome/Edge"}
              >
                <Bluetooth className="size-4" />
                Pair Bluetooth
              </Button>
            )}
            <Button
              className="h-9 px-3 text-xs"
              onClick={() => connectVia("simulator")}
            >
              <Play className="size-4" />
              Start Simulator
            </Button>
            {live && (
              <Button
                variant="ghost"
                className="h-9 px-3 text-xs text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                onClick={() => void disconnect(device.id)}
              >
                <CircleStop className="size-4" />
                Stop
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {(!canSerial || !canBle) && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Radio className="size-3.5" />
          {!canSerial && !canBle
            ? "This browser can't access serial or Bluetooth devices — use Chrome or Edge over HTTPS for real hardware. The simulator works everywhere."
            : !canSerial
              ? "Web Serial unavailable here; use Chrome/Edge for serial hardware."
              : "Web Bluetooth unavailable here; use Chrome/Edge for BLE hardware."}
        </p>
      )}

      {/* Metrics (all dashboards show the metric grid) */}
      <MetricGrid metrics={driver.metrics} values={latest?.metrics} />

      {/* Dashboard-specific layout */}
      {driver.dashboard === "waveform" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {driver.metrics.slice(0, 2).map((m) => (
            <Waveform
              key={m.key}
              history={history}
              metricKey={m.key}
              label={m.label}
              unit={m.unit}
            />
          ))}
        </div>
      )}

      {driver.dashboard === "vitals" && driver.metrics[0] && (
        <Waveform
          history={history}
          metricKey={driver.metrics[0].key}
          label={`${driver.metrics[0].label} trend`}
          unit={driver.metrics[0].unit}
        />
      )}

      {driver.dashboard === "pump" && (
        <Card>
          <CardHeader>
            <CardTitle>Infusion Progress</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <InfusionProgress
              infused={Number(latest?.metrics.vinf ?? 0)}
              remaining={Number(latest?.metrics.vtbi ?? 0)}
            />
          </CardContent>
        </Card>
      )}

      {/* Raw stream log */}
      <Card>
        <CardHeader>
          <CardTitle>Live Stream</CardTitle>
          <span className="text-xs text-muted-foreground tabular-nums">
            {history.length} frames
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="max-h-56 divide-y divide-border overflow-y-auto font-mono text-xs">
            {history.length === 0 ? (
              <li className="px-5 py-6 text-center text-muted-foreground">
                No frames yet — start a transport above.
              </li>
            ) : (
              [...history]
                .reverse()
                .slice(0, 20)
                .map((r, i) => (
                  <li key={`${r.ts}-${i}`} className="flex gap-3 px-5 py-2">
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(r.ts).toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta" })}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {Object.entries(r.metrics)
                        .map(([k, v]) => `${k}=${v}`)
                        .join("  ")}
                    </span>
                  </li>
                ))
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function InfusionProgress({
  infused,
  remaining,
}: {
  infused: number;
  remaining: number;
}) {
  const total = infused + remaining || 1;
  const pct = Math.round((infused / total) * 100);
  return (
    <>
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{infused} mL infused</span>
        <span className="font-medium">{remaining} mL remaining</span>
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Radio, Search } from "lucide-react";
import { drivers, driverCategories } from "@/lib/devices/registry";
import { registerDevice, useDevices } from "@/lib/devices/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Dialog } from "@/components/ui/dialog";
import { DeviceStatusPill } from "@/components/devices/device-status-pill";
import { cn } from "@/lib/utils";

export function DevicesView() {
  const devices = useDevices();
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const streaming = devices.filter((d) => d.status === "streaming").length;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? devices.filter(
        (d) =>
          d.label.toLowerCase().includes(q) ||
          d.kind.toLowerCase().includes(q) ||
          (d.patientId ?? "").toLowerCase().includes(q),
      )
    : devices;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Connected medical hardware. Each device renders its own dashboard;
          connect via serial, Bluetooth or the built-in simulator.
        </p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add device
        </Button>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Devices" value={devices.length} icon={Radio} />
        <StatCard label="Streaming" value={streaming} icon={Radio} tone="success" />
        <StatCard label="Device Kinds" value={drivers.length} icon={Radio} />
      </section>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search devices…"
          aria-label="Search devices"
          className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((d) => {
          const driver = drivers.find((x) => x.kind === d.kind);
          const Icon = driver?.icon ?? Radio;
          return (
            <Link key={d.id} href={`/devices/${encodeURIComponent(d.id)}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <DeviceStatusPill status={d.status} />
                  </div>
                  <div>
                    <p className="font-medium">{d.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {driver?.label ?? d.kind}
                      {d.patientId ? ` · ${d.patientId}` : ""}
                    </p>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Open dashboard <ChevronRight className="size-3.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            No devices match your search.
          </p>
        )}
      </div>

      <AddDeviceDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function AddDeviceDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [kind, setKind] = useState(drivers[0].kind);
  const [label, setLabel] = useState("");
  const categories = driverCategories();

  const submit = () => {
    const driver = drivers.find((d) => d.kind === kind)!;
    const id = `${kind}:${label.trim() || `New-${Date.now() % 10000}`}`;
    registerDevice({
      id,
      kind,
      label: label.trim() || id.split(":")[1],
      transport: driver.transports[0],
      status: "idle",
      lastSeen: new Date().toISOString(),
    });
    setLabel("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add Device"
      description="Register a device, then open it to connect a live stream."
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Device kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            {categories.map((cat) => (
              <optgroup key={cat} label={cat}>
                {drivers
                  .filter((d) => d.category === cat)
                  .map((d) => (
                    <option key={d.kind} value={d.kind}>
                      {d.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Label / location
          </span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. ICU-Bed-02"
            className={cn(
              "h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none",
              "transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30",
            )}
          />
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit}>Add device</Button>
      </div>
    </Dialog>
  );
}

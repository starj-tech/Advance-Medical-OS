"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getDriver } from "@/lib/devices/registry";
import { useDevice } from "@/lib/devices/store";
import { Badge } from "@/components/ui/badge";
import { DeviceDashboard } from "@/components/devices/device-dashboard";

export function DeviceDetail({ id }: { id: string }) {
  const device = useDevice(id);

  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">
          Device not found in this session.
        </p>
        <Link href="/devices" className="text-sm font-medium text-primary hover:underline">
          Back to devices
        </Link>
      </div>
    );
  }

  const driver = getDriver(device.kind);
  const Icon = driver?.icon;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/devices" className="hover:text-foreground">
          Devices
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{device.label}</span>
      </nav>

      <div className="flex items-center gap-4">
        {Icon && (
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-7" />
          </span>
        )}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{device.label}</h2>
            {driver && <Badge variant="muted">{driver.category}</Badge>}
            {device.patientId && <Badge variant="info">{device.patientId}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {driver?.label ?? device.kind} · {device.id}
          </p>
        </div>
      </div>

      {driver ? (
        <DeviceDashboard device={device} driver={driver} />
      ) : (
        <p className="text-sm text-muted-foreground">
          No driver registered for kind “{device.kind}”.
        </p>
      )}

      {driver && (
        <p className="text-xs text-muted-foreground">{driver.description}</p>
      )}
    </div>
  );
}

"use client";

/**
 * Client device store — orchestrates live hardware connections.
 *
 * Responsibilities:
 *   - Hold the device registry (synced with /api/devices) and the latest
 *     reading + a short history per device, for the dashboards.
 *   - Own the active Transport per connected device (Web Serial / Web Bluetooth
 *     / Simulator), wiring its events into status + readings.
 *   - Mirror each reading to the server (/api/devices/[id]/readings) so the
 *     fleet view and other clients stay consistent — the same role the central
 *     consumer played in hardware_bridge.rs.
 *
 * useSyncExternalStore so any component reads live state without a provider.
 */

import { useSyncExternalStore } from "react";
import type { Device, DeviceReading, DeviceStatus } from "@/lib/types-devices";
import { getDriver } from "./registry";
import { makeTransport, type Transport } from "./transport";

const HISTORY = 60; // keep the last 60 readings per device for sparklines

type Live = {
  device: Device;
  latest?: DeviceReading;
  history: DeviceReading[];
  transport?: Transport;
};

const devices = new Map<string, Live>();
const listeners = new Set<() => void>();
let snapshot: Device[] = [];
let booted = false;

function rebuildSnapshot() {
  snapshot = [...devices.values()].map((l) => l.device);
}
function emit() {
  rebuildSnapshot();
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (!booted) {
    booted = true;
    void boot();
  }
  return () => listeners.delete(cb);
}

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** Load the known device registry from the API. */
async function boot() {
  try {
    const res = await fetch(`${BASE}/api/devices`, { cache: "no-store" });
    const list = (await res.json()) as Device[];
    for (const d of list) {
      if (!devices.has(d.id)) devices.set(d.id, { device: d, history: [] });
    }
    emit();
  } catch {
    /* offline: start empty, user can still connect a device */
  }
}

async function mirror(reading: DeviceReading) {
  try {
    await fetch(
      `${BASE}/api/devices/${encodeURIComponent(reading.deviceId)}/readings`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(reading),
      },
    );
  } catch {
    /* best-effort; UI already updated locally */
  }
}

function setStatus(id: string, status: DeviceStatus) {
  const live = devices.get(id);
  if (!live) return;
  live.device = { ...live.device, status, lastSeen: new Date().toISOString() };
  emit();
}

/* --------------------------------- actions -------------------------------- */

/** Register (or update) a device instance, e.g. before connecting. */
export function registerDevice(d: Device) {
  const existing = devices.get(d.id);
  devices.set(d.id, existing ? { ...existing, device: d } : { device: d, history: [] });
  emit();
}

/** Begin streaming for a device via the chosen transport. */
export async function connect(
  id: string,
  transportKind: "web-serial" | "web-bluetooth" | "simulator",
) {
  const live = devices.get(id);
  if (!live) return;
  const driver = getDriver(live.device.kind);
  if (!driver) return;

  await live.transport?.stop();
  const transport = makeTransport(driver, transportKind);
  live.transport = transport;
  live.device = { ...live.device, transport: transportKind };

  await transport.start((e) => {
    if (e.type === "status") {
      setStatus(id, e.status);
      return;
    }
    const reading: DeviceReading = {
      deviceId: id,
      kind: live.device.kind,
      ts: new Date().toISOString(),
      status: "streaming",
      metrics: e.metrics,
    };
    live.latest = reading;
    live.history = [...live.history, reading].slice(-HISTORY);
    live.device = { ...live.device, status: "streaming", lastSeen: reading.ts };
    emit();
    void mirror(reading);
  });
}

export async function disconnect(id: string) {
  const live = devices.get(id);
  if (!live) return;
  await live.transport?.stop();
  live.transport = undefined;
  setStatus(id, "disconnected");
}

/* --------------------------------- hooks ---------------------------------- */

const getSnapshot = () => snapshot;
const EMPTY_HISTORY: DeviceReading[] = [];

export function useDevices(): Device[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useDevice(id: string): Device | undefined {
  return useDevices().find((d) => d.id === id);
}

/**
 * Latest reading for a device (live). The snapshot is the stored reading object,
 * which is only ever replaced with a new reference on change, so it satisfies
 * useSyncExternalStore's caching requirement.
 */
export function useLatestReading(id: string): DeviceReading | undefined {
  return useSyncExternalStore(
    subscribe,
    () => devices.get(id)?.latest,
    () => undefined,
  );
}

/** Reading history for a device (live), for sparklines/waveforms. */
export function useReadingHistory(id: string): DeviceReading[] {
  return useSyncExternalStore(
    subscribe,
    () => devices.get(id)?.history ?? EMPTY_HISTORY,
    () => EMPTY_HISTORY,
  );
}

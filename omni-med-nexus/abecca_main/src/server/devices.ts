/**
 * Server-side device registry + recent-readings buffer for the hardware BFF.
 *
 * Holds the set of connected/known devices and a rolling window of their
 * readings. The gateway transport (for legacy RS-232 / HL7 / DICOM hardware
 * that browsers cannot reach) POSTs frames here; clients poll or the client
 * store reconciles. Process-global singleton; resets on restart.
 *
 * PERSISTENCE: this is the in-memory default. A Supabase-backed implementation
 * with the same function signatures can replace it once the correct project is
 * configured (devices + device_readings tables + Realtime) — see
 * src/lib/devices/persistence.ts for the contract. No route or UI change needed.
 */

import type { Device, DeviceReading, DeviceStatus } from "@/lib/types-devices";

type DB = {
  devices: Map<string, Device>;
  readings: DeviceReading[]; // newest last; capped
};

const CAP = 500;

function build(): DB {
  // Seed a couple of representative connected devices so the registry isn't
  // empty on first load (matches the "ICU-Bed-01" sample in hardware_bridge.rs).
  const now = new Date().toISOString();
  const devices = new Map<string, Device>();
  devices.set("vitals-monitor:ICU-Bed-01", {
    id: "vitals-monitor:ICU-Bed-01",
    kind: "vitals-monitor",
    label: "ICU-Bed-01",
    transport: "simulator",
    status: "idle",
    lastSeen: now,
    patientId: "PAT-123",
  });
  devices.set("infusion-pump:ICU-Bed-01", {
    id: "infusion-pump:ICU-Bed-01",
    kind: "infusion-pump",
    label: "ICU-Bed-01 Pump",
    transport: "simulator",
    status: "idle",
    lastSeen: now,
    patientId: "PAT-123",
  });
  return { devices, readings: [] };
}

const g = globalThis as unknown as { __abeccaDevices?: DB };
const db: DB = g.__abeccaDevices ?? (g.__abeccaDevices = build());

export function listDevices(): Device[] {
  return [...db.devices.values()];
}

export function getDevice(id: string): Device | undefined {
  return db.devices.get(id);
}

export function upsertDevice(d: Device): Device {
  db.devices.set(d.id, { ...db.devices.get(d.id), ...d });
  return db.devices.get(d.id)!;
}

export function setDeviceStatus(
  id: string,
  status: DeviceStatus,
): Device | undefined {
  const d = db.devices.get(id);
  if (!d) return undefined;
  d.status = status;
  d.lastSeen = new Date().toISOString();
  return d;
}

/** Ingest a reading (from the gateway or a client mirroring its stream). */
export function ingestReading(r: DeviceReading): DeviceReading {
  const existing = db.devices.get(r.deviceId);
  if (existing) {
    existing.status = r.status;
    existing.lastSeen = r.ts;
  }
  db.readings.push(r);
  if (db.readings.length > CAP) db.readings.splice(0, db.readings.length - CAP);
  return r;
}

export function recentReadings(deviceId?: string, limit = 100): DeviceReading[] {
  const all = deviceId
    ? db.readings.filter((r) => r.deviceId === deviceId)
    : db.readings;
  return all.slice(-limit);
}

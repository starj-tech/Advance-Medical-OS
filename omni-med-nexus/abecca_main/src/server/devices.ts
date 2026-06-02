/**
 * Server-side device registry + recent-readings buffer for the hardware BFF.
 *
 * Holds the set of connected/known devices and a rolling window of their
 * readings. The gateway transport (for legacy RS-232 / HL7 / DICOM hardware
 * that browsers cannot reach) POSTs frames here; clients poll or the client
 * store reconciles.
 *
 * PERSISTENCE: two interchangeable backends behind one async API. When
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, reads/writes go to the
 * `devices` + `device_readings` tables (durable, shared across instances) via
 * devices-supabase.ts. Otherwise a process-global in-memory singleton is used
 * (resets on restart) — the zero-config preview default. No route or UI change
 * is needed to switch.
 */

import type { Device, DeviceReading, DeviceStatus } from "@/lib/types-devices";
import { getSupabase } from "./supabase";
import * as supa from "./devices-supabase";

/* ============================ in-memory backend ============================ */

type MemDB = {
  devices: Map<string, Device>;
  readings: DeviceReading[]; // newest last; capped
};

const CAP = 500;

function build(): MemDB {
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

const g = globalThis as unknown as { __abeccaDevices?: MemDB };
const mdb: MemDB = g.__abeccaDevices ?? (g.__abeccaDevices = build());

const memory = {
  listDevices: (): Device[] => [...mdb.devices.values()],
  getDevice: (id: string): Device | undefined => mdb.devices.get(id),
  upsertDevice: (d: Device): Device => {
    mdb.devices.set(d.id, { ...mdb.devices.get(d.id), ...d });
    return mdb.devices.get(d.id)!;
  },
  setDeviceStatus: (id: string, status: DeviceStatus): Device | undefined => {
    const d = mdb.devices.get(id);
    if (!d) return undefined;
    d.status = status;
    d.lastSeen = new Date().toISOString();
    return d;
  },
  ingestReading: (r: DeviceReading): DeviceReading => {
    const existing = mdb.devices.get(r.deviceId);
    if (existing) {
      existing.status = r.status;
      existing.lastSeen = r.ts;
    }
    mdb.readings.push(r);
    if (mdb.readings.length > CAP)
      mdb.readings.splice(0, mdb.readings.length - CAP);
    return r;
  },
  recentReadings: (deviceId?: string, limit = 100): DeviceReading[] => {
    const all = deviceId
      ? mdb.readings.filter((r) => r.deviceId === deviceId)
      : mdb.readings;
    return all.slice(-limit);
  },
};

/* ============================== public API ================================ */
/* Async everywhere; delegates to Supabase when configured, else in-memory.   */

export async function listDevices(): Promise<Device[]> {
  const sb = getSupabase();
  return sb ? supa.listDevices(sb) : memory.listDevices();
}

export async function getDevice(id: string): Promise<Device | undefined> {
  const sb = getSupabase();
  return sb ? supa.getDevice(sb, id) : memory.getDevice(id);
}

export async function upsertDevice(d: Device): Promise<Device> {
  const sb = getSupabase();
  return sb ? supa.upsertDevice(sb, d) : memory.upsertDevice(d);
}

export async function setDeviceStatus(
  id: string,
  status: DeviceStatus,
): Promise<Device | undefined> {
  const sb = getSupabase();
  return sb ? supa.setDeviceStatus(sb, id, status) : memory.setDeviceStatus(id, status);
}

/** Ingest a reading (from the gateway or a client mirroring its stream). */
export async function ingestReading(r: DeviceReading): Promise<DeviceReading> {
  const sb = getSupabase();
  return sb ? supa.ingestReading(sb, r) : memory.ingestReading(r);
}

export async function recentReadings(
  deviceId?: string,
  limit = 100,
): Promise<DeviceReading[]> {
  const sb = getSupabase();
  return sb ? supa.recentReadings(sb, deviceId, limit) : memory.recentReadings(deviceId, limit);
}

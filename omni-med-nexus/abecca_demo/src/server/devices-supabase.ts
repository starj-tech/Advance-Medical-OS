/**
 * Supabase-backed implementation of the device registry + readings buffer.
 *
 * Mirrors the in-memory store in devices.ts so the public async API there can
 * delegate here when Supabase is configured. `device_readings` is durable (not
 * capped like the in-memory ring); reads are bounded by the `limit` argument.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Device, DeviceReading, DeviceStatus } from "@/lib/types-devices";

interface DeviceRow {
  id: string;
  kind: string;
  label: string;
  transport: Device["transport"];
  status: DeviceStatus;
  last_seen: string | null;
  patient_id: string | null;
}

interface ReadingRow {
  device_id: string;
  kind: string;
  ts: string;
  status: DeviceStatus;
  metrics: Record<string, number | string> | null;
}

function rowToDevice(r: DeviceRow): Device {
  return {
    id: r.id,
    kind: r.kind,
    label: r.label,
    transport: r.transport,
    status: r.status,
    lastSeen: r.last_seen ?? undefined,
    patientId: r.patient_id ?? undefined,
  };
}

function deviceToRow(d: Device): DeviceRow {
  return {
    id: d.id,
    kind: d.kind,
    label: d.label,
    transport: d.transport,
    status: d.status,
    last_seen: d.lastSeen ?? null,
    patient_id: d.patientId ?? null,
  };
}

function rowToReading(r: ReadingRow): DeviceReading {
  return {
    deviceId: r.device_id,
    kind: r.kind,
    ts: r.ts,
    status: r.status,
    metrics: r.metrics ?? {},
  };
}

export async function listDevices(sb: SupabaseClient): Promise<Device[]> {
  const { data } = await sb
    .from("devices")
    .select("*")
    .order("id", { ascending: true })
    .returns<DeviceRow[]>();
  return (data ?? []).map(rowToDevice);
}

export async function getDevice(
  sb: SupabaseClient,
  id: string,
): Promise<Device | undefined> {
  const { data } = await sb
    .from("devices")
    .select("*")
    .eq("id", id)
    .maybeSingle<DeviceRow>();
  return data ? rowToDevice(data) : undefined;
}

export async function upsertDevice(
  sb: SupabaseClient,
  d: Device,
): Promise<Device> {
  // Merge with any existing row so partial upserts (e.g. the gateway omitting
  // patientId) don't clobber known fields — mirrors the in-memory spread.
  const existing = await getDevice(sb, d.id);
  const merged: Device = { ...existing, ...d };
  await sb.from("devices").upsert(deviceToRow(merged), { onConflict: "id" });
  return merged;
}

export async function setDeviceStatus(
  sb: SupabaseClient,
  id: string,
  status: DeviceStatus,
): Promise<Device | undefined> {
  const existing = await getDevice(sb, id);
  if (!existing) return undefined;
  const lastSeen = new Date().toISOString();
  await sb.from("devices").update({ status, last_seen: lastSeen }).eq("id", id);
  return { ...existing, status, lastSeen };
}

export async function ingestReading(
  sb: SupabaseClient,
  r: DeviceReading,
): Promise<DeviceReading> {
  // Reflect the latest status/last-seen onto the device if it is registered.
  await sb
    .from("devices")
    .update({ status: r.status, last_seen: r.ts })
    .eq("id", r.deviceId);
  await sb.from("device_readings").insert({
    device_id: r.deviceId,
    kind: r.kind,
    ts: r.ts,
    status: r.status,
    metrics: r.metrics,
  });
  return r;
}

export async function recentReadings(
  sb: SupabaseClient,
  deviceId?: string,
  limit = 100,
): Promise<DeviceReading[]> {
  let q = sb
    .from("device_readings")
    .select("*")
    .order("ts", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (deviceId) q = q.eq("device_id", deviceId);
  const { data } = await q.returns<ReadingRow[]>();
  // Stored newest-first above; return oldest→newest like the in-memory buffer.
  return (data ?? []).map(rowToReading).reverse();
}

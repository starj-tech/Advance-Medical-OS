/**
 * Server-safe device types (no React/lucide imports), so route handlers and the
 * server datastore can use them without pulling client-only modules. The richer
 * client-side model (with icon components and parse/simulate functions) lives in
 * src/lib/devices/types.ts and re-exports these.
 */

export type TransportKind =
  | "web-serial"
  | "web-bluetooth"
  | "simulator"
  | "gateway";

export type DeviceStatus =
  | "connecting"
  | "streaming"
  | "idle"
  | "resetting"
  | "disconnected"
  | "error";

export interface Device {
  id: string;
  kind: string;
  label: string;
  transport: TransportKind;
  status: DeviceStatus;
  lastSeen?: string;
  patientId?: string;
}

export interface DeviceReading {
  deviceId: string;
  kind: string;
  ts: string;
  status: DeviceStatus;
  metrics: Record<string, number | string>;
}

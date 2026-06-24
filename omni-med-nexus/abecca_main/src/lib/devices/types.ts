/**
 * Hardware-integration domain model for the Abecca clinical portal.
 *
 * This is the web re-architecture of the original native bridge
 * (omni_med_nexus_os/tauri_app/src-tauri/src/hardware_bridge.rs), which read
 * physical serial ports with the Rust `serialport` crate and streamed
 * `SensorData` frames to the UI. On the web the physical connection moves to
 * the *client* (the machine actually next to the device) via browser hardware
 * APIs, while the data model, framing and watchdog behaviour are preserved.
 *
 * The design scales to "tens or hundreds" of device kinds: each kind is a
 * `DriverDescriptor` in the registry, and the UI renders whichever dashboard
 * that descriptor names. Adding a device = adding a descriptor.
 */

import type { LucideIcon } from "lucide-react";
import type {
  Device,
  DeviceReading,
  DeviceStatus,
  TransportKind,
} from "@/lib/types-devices";

// Re-export the server-safe primitives so client code has one import site.
// `resetting` mirrors the HARDWARE_RESET watchdog state in hardware_bridge.rs.
export type { Device, DeviceReading, DeviceStatus, TransportKind };

/** A single metric a device reports (e.g. heart rate, SpO₂, flow rate). */
export interface MetricSpec {
  key: string;
  label: string;
  unit: string;
  /** Inclusive normal range; values outside flag an alert in the UI. */
  min?: number;
  max?: number;
  /** Precision for display. */
  precision?: number;
}

/**
 * A device "driver": everything the UI needs to recognise a kind of hardware,
 * render its dashboard, and interpret its frames. Hundreds of these can coexist.
 */
export interface DriverDescriptor {
  kind: string; // stable id, e.g. "vitals-monitor"
  label: string; // human name, e.g. "Patient Vitals Monitor"
  category: DeviceCategory;
  icon: LucideIcon;
  /** Which dashboard component renders this device (resolved in the registry). */
  dashboard: "vitals" | "waveform" | "pump" | "generic";
  /** Metrics this device reports, in display order. */
  metrics: MetricSpec[];
  /** Transports this device supports, best first. */
  transports: TransportKind[];
  /** Short description of the real-world device. */
  description: string;
  /**
   * Parse one decoded frame (already newline-delimited upstream) into metric
   * values. Frames are "key=value;key=value" or JSON; tolerant by design.
   */
  parseFrame: (frame: string) => Record<string, number | string> | null;
  /** Generate one synthetic reading (simulator + offline demo/training). */
  simulate: () => Record<string, number | string>;
}

export type DeviceCategory =
  | "Monitoring"
  | "Respiratory"
  | "Infusion"
  | "Diagnostics"
  | "Point of Care"
  | "Imaging";

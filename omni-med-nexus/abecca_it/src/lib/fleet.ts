/**
 * Read-only device-fleet model for the IT operations console.
 *
 * abecca_it observes the medical-device fleet integrated by abecca_main (the
 * clinical portal owns connection/control; IT owns monitoring). It reads the
 * clinical app's device API when NEXT_PUBLIC_MAIN_API_URL is set, and otherwise
 * renders a representative snapshot so the page works standalone.
 */

export type DeviceStatus =
  | "connecting"
  | "streaming"
  | "idle"
  | "resetting"
  | "disconnected"
  | "error";

export interface FleetDevice {
  id: string;
  kind: string;
  label: string;
  transport: "web-serial" | "web-bluetooth" | "simulator" | "gateway";
  status: DeviceStatus;
  lastSeen?: string;
  patientId?: string;
}

/** Representative fallback fleet (used when the clinical API isn't configured). */
export const seedFleet: FleetDevice[] = [
  { id: "vitals-monitor:ICU-Bed-01", kind: "vitals-monitor", label: "ICU-Bed-01", transport: "web-serial", status: "streaming", patientId: "PAT-123", lastSeen: "2026-05-30T06:00:00Z" },
  { id: "infusion-pump:ICU-Bed-01", kind: "infusion-pump", label: "ICU-Bed-01 Pump", transport: "web-serial", status: "streaming", patientId: "PAT-123", lastSeen: "2026-05-30T06:00:00Z" },
  { id: "ventilator:ICU-Bed-02", kind: "ventilator", label: "ICU-Bed-02 Vent", transport: "gateway", status: "streaming", patientId: "PAT-204", lastSeen: "2026-05-30T05:59:00Z" },
  { id: "ecg-monitor:OR-1", kind: "ecg-monitor", label: "OR-1 ECG", transport: "gateway", status: "streaming", lastSeen: "2026-05-30T05:58:00Z" },
  { id: "pulse-oximeter:Ward-A-12", kind: "pulse-oximeter", label: "Ward-A-12 SpO₂", transport: "web-bluetooth", status: "idle", patientId: "PAT-310", lastSeen: "2026-05-30T05:40:00Z" },
  { id: "capnograph:OR-1", kind: "capnograph", label: "OR-1 EtCO₂", transport: "gateway", status: "resetting", lastSeen: "2026-05-30T05:57:00Z" },
  { id: "fetal-monitor:L&D-3", kind: "fetal-monitor", label: "L&D-3 CTG", transport: "web-serial", status: "disconnected", lastSeen: "2026-05-30T05:30:00Z" },
  { id: "glucometer:POCT-2", kind: "glucometer", label: "POCT-2 Glucose", transport: "web-bluetooth", status: "error", lastSeen: "2026-05-30T05:20:00Z" },
];

const transportLabels: Record<FleetDevice["transport"], string> = {
  "web-serial": "Web Serial",
  "web-bluetooth": "Bluetooth",
  simulator: "Simulator",
  gateway: "Gateway",
};

export function transportLabel(t: FleetDevice["transport"]): string {
  return transportLabels[t];
}

/** Fetch the live fleet from the clinical app, or fall back to the seed. */
export async function fetchFleet(): Promise<FleetDevice[]> {
  const base = process.env.NEXT_PUBLIC_MAIN_API_URL;
  if (!base) return seedFleet;
  try {
    const res = await fetch(`${base}/api/devices`, { cache: "no-store" });
    if (!res.ok) return seedFleet;
    return (await res.json()) as FleetDevice[];
  } catch {
    return seedFleet;
  }
}

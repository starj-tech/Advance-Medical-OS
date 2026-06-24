/**
 * Driver registry — the catalogue of hardware kinds Abecca can integrate.
 *
 * This is what makes "tens or hundreds of different devices, each with its own
 * UI" tractable: every kind is one DriverDescriptor here. The dynamic device
 * page reads `dashboard` to pick a renderer and `metrics` to lay it out, so a
 * new device needs no new page — just an entry in this array.
 *
 * `parseFrame` accepts a newline-delimited frame (the same framing the original
 * hardware_bridge.rs used: read bytes, split on '\n', parse each frame). It
 * tolerates either "k=v;k=v" or JSON. `simulate` powers the built-in simulator
 * transport and offline demo/training.
 */

import {
  Activity,
  Baby,
  Droplets,
  HeartPulse,
  Scale,
  Stethoscope,
  Syringe,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react";
import type { DriverDescriptor } from "./types";

const rnd = (min: number, max: number, p = 0) => {
  const v = min + Math.random() * (max - min);
  return p ? Math.round(v * 10 ** p) / 10 ** p : Math.round(v);
};

/** Parse "hr=78;spo2=98;bp=120/80" or JSON into a flat record. */
function parseKv(frame: string): Record<string, number | string> | null {
  const t = frame.trim();
  if (!t) return null;
  if (t.startsWith("{")) {
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  const out: Record<string, number | string> = {};
  for (const pair of t.split(/[;,]/)) {
    const [k, v] = pair.split("=").map((s) => s.trim());
    if (!k || v === undefined) continue;
    const n = Number(v);
    out[k] = Number.isFinite(n) && /^-?\d/.test(v) ? n : v;
  }
  return Object.keys(out).length ? out : null;
}

export const drivers: DriverDescriptor[] = [
  {
    kind: "vitals-monitor",
    label: "Patient Vitals Monitor",
    category: "Monitoring",
    icon: HeartPulse,
    dashboard: "vitals",
    description:
      "Bedside multiparameter monitor (HR, SpO₂, NIBP, temp). Serial-over-USB, 9600 baud — the device class the original hardware bridge read.",
    transports: ["web-serial", "simulator", "gateway"],
    metrics: [
      { key: "hr", label: "Heart Rate", unit: "bpm", min: 60, max: 100 },
      { key: "spo2", label: "SpO₂", unit: "%", min: 95, max: 100 },
      { key: "sys", label: "Systolic", unit: "mmHg", min: 90, max: 140 },
      { key: "dia", label: "Diastolic", unit: "mmHg", min: 60, max: 90 },
      { key: "temp", label: "Temp", unit: "°C", min: 36, max: 37.8, precision: 1 },
    ],
    parseFrame: parseKv,
    simulate: () => ({
      hr: rnd(68, 96),
      spo2: rnd(94, 100),
      sys: rnd(108, 138),
      dia: rnd(64, 88),
      temp: rnd(36.2, 37.9, 1),
    }),
  },
  {
    kind: "pulse-oximeter",
    label: "Pulse Oximeter (BLE)",
    category: "Point of Care",
    icon: Activity,
    dashboard: "vitals",
    description:
      "Fingertip SpO₂ + pulse sensor over Bluetooth Low Energy (Web Bluetooth).",
    transports: ["web-bluetooth", "simulator"],
    metrics: [
      { key: "spo2", label: "SpO₂", unit: "%", min: 95, max: 100 },
      { key: "pr", label: "Pulse", unit: "bpm", min: 60, max: 100 },
      { key: "pi", label: "Perfusion", unit: "%", min: 1, max: 20, precision: 1 },
    ],
    parseFrame: parseKv,
    simulate: () => ({ spo2: rnd(93, 100), pr: rnd(62, 98), pi: rnd(1, 12, 1) }),
  },
  {
    kind: "ventilator",
    label: "Mechanical Ventilator",
    category: "Respiratory",
    icon: Wind,
    dashboard: "waveform",
    description:
      "ICU ventilator reporting tidal volume, rate, PEEP and FiO₂.",
    transports: ["web-serial", "simulator", "gateway"],
    metrics: [
      { key: "rate", label: "Resp Rate", unit: "/min", min: 12, max: 20 },
      { key: "tidal", label: "Tidal Vol", unit: "mL", min: 400, max: 600 },
      { key: "peep", label: "PEEP", unit: "cmH₂O", min: 5, max: 10 },
      { key: "fio2", label: "FiO₂", unit: "%", min: 21, max: 60 },
    ],
    parseFrame: parseKv,
    simulate: () => ({
      rate: rnd(12, 22),
      tidal: rnd(380, 620),
      peep: rnd(4, 12),
      fio2: rnd(21, 65),
    }),
  },
  {
    kind: "infusion-pump",
    label: "IV Infusion Pump",
    category: "Infusion",
    icon: Syringe,
    dashboard: "pump",
    description:
      "Volumetric infusion pump reporting flow rate, volume infused and pressure.",
    transports: ["web-serial", "simulator", "gateway"],
    metrics: [
      { key: "rate", label: "Flow Rate", unit: "mL/h", min: 0, max: 300 },
      { key: "vinf", label: "Infused", unit: "mL", min: 0, max: 1000 },
      { key: "vtbi", label: "Remaining", unit: "mL", min: 0, max: 1000 },
      { key: "pressure", label: "Pressure", unit: "mmHg", min: 0, max: 300 },
    ],
    parseFrame: parseKv,
    simulate: () => ({
      rate: rnd(20, 180),
      vinf: rnd(50, 900),
      vtbi: rnd(100, 950),
      pressure: rnd(20, 180),
    }),
  },
  {
    kind: "ecg-monitor",
    label: "ECG Monitor",
    category: "Diagnostics",
    icon: Waves,
    dashboard: "waveform",
    description: "Continuous 3-lead ECG with rhythm classification.",
    transports: ["web-serial", "simulator", "gateway"],
    metrics: [
      { key: "hr", label: "Heart Rate", unit: "bpm", min: 60, max: 100 },
      { key: "qt", label: "QT", unit: "ms", min: 350, max: 450 },
      { key: "pr", label: "PR", unit: "ms", min: 120, max: 200 },
    ],
    parseFrame: parseKv,
    simulate: () => ({ hr: rnd(58, 104), qt: rnd(340, 460), pr: rnd(110, 210) }),
  },
  {
    kind: "glucometer",
    label: "Blood Glucose Meter",
    category: "Point of Care",
    icon: Droplets,
    dashboard: "generic",
    description: "Point-of-care glucometer (BLE or serial dock).",
    transports: ["web-bluetooth", "web-serial", "simulator"],
    metrics: [{ key: "glucose", label: "Glucose", unit: "mg/dL", min: 70, max: 180 }],
    parseFrame: parseKv,
    simulate: () => ({ glucose: rnd(64, 210) }),
  },
  {
    kind: "thermometer",
    label: "Continuous Thermometer",
    category: "Monitoring",
    icon: Thermometer,
    dashboard: "generic",
    description: "Wearable continuous temperature patch (BLE).",
    transports: ["web-bluetooth", "simulator"],
    metrics: [
      { key: "temp", label: "Temp", unit: "°C", min: 36, max: 37.8, precision: 1 },
    ],
    parseFrame: parseKv,
    simulate: () => ({ temp: rnd(35.8, 38.6, 1) }),
  },
  {
    kind: "weight-scale",
    label: "Bed Weight Scale",
    category: "Monitoring",
    icon: Scale,
    dashboard: "generic",
    description: "In-bed weight scale for fluid-balance monitoring.",
    transports: ["web-serial", "simulator", "gateway"],
    metrics: [
      { key: "weight", label: "Weight", unit: "kg", min: 40, max: 150, precision: 1 },
    ],
    parseFrame: parseKv,
    simulate: () => ({ weight: rnd(48, 132, 1) }),
  },
  {
    kind: "fetal-monitor",
    label: "Fetal Monitor (CTG)",
    category: "Monitoring",
    icon: Baby,
    dashboard: "waveform",
    description: "Cardiotocograph reporting fetal heart rate and uterine activity.",
    transports: ["web-serial", "simulator", "gateway"],
    metrics: [
      { key: "fhr", label: "Fetal HR", unit: "bpm", min: 110, max: 160 },
      { key: "toco", label: "Uterine", unit: "%", min: 0, max: 100 },
    ],
    parseFrame: parseKv,
    simulate: () => ({ fhr: rnd(105, 165), toco: rnd(0, 90) }),
  },
  {
    kind: "capnograph",
    label: "Capnograph (EtCO₂)",
    category: "Respiratory",
    icon: Stethoscope,
    dashboard: "waveform",
    description: "End-tidal CO₂ and respiratory rate monitor.",
    transports: ["web-serial", "simulator", "gateway"],
    metrics: [
      { key: "etco2", label: "EtCO₂", unit: "mmHg", min: 35, max: 45 },
      { key: "rr", label: "Resp Rate", unit: "/min", min: 12, max: 20 },
    ],
    parseFrame: parseKv,
    simulate: () => ({ etco2: rnd(30, 50), rr: rnd(10, 24) }),
  },
];

const byKind = new Map(drivers.map((d) => [d.kind, d]));

export function getDriver(kind: string): DriverDescriptor | undefined {
  return byKind.get(kind);
}

export function driverCategories(): string[] {
  return [...new Set(drivers.map((d) => d.category))];
}

/**
 * Content for the Abecca Demo & training sandbox. This app is a guided tour of
 * what the Omni-Med Nexus platform does — every capability listed maps to a
 * real part of the system (core_engine modules or the clinical/admin portals).
 */

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BedDouble,
  Lock,
  Pill,
  Receipt,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

/** Stable string keys so capabilities can travel over the API as JSON. */
export type IconKey =
  | "clinical"
  | "encryption"
  | "audit"
  | "wards"
  | "billing"
  | "pharmacy"
  | "staff"
  | "data";

/** Maps a serializable icon key back to its Lucide component (client side). */
export const iconByKey: Record<IconKey, LucideIcon> = {
  clinical: Stethoscope,
  encryption: Lock,
  audit: ShieldCheck,
  wards: BedDouble,
  billing: Receipt,
  pharmacy: Pill,
  staff: Users,
  data: Activity,
};

export interface Capability {
  iconKey: IconKey;
  title: string;
  description: string;
  source: string; // where this lives in the real system
}

export const capabilities: Capability[] = [
  {
    iconKey: "clinical",
    title: "Clinical Portal",
    description:
      "Patient roster, vitals, Early Warning Scores and ICD-10 diagnoses for bedside teams.",
    source: "abecca_main",
  },
  {
    iconKey: "encryption",
    title: "AES-256-GCM Encryption",
    description:
      "Patient PII (national ID, medical history) is sealed at rest; keys never leave the core.",
    source: "core_engine · security/encryption.rs",
  },
  {
    iconKey: "audit",
    title: "Blockchain Audit Trail",
    description:
      "Every record access and change is hashed into a tamper-evident SHA-256 chain.",
    source: "core_engine · blockchain/",
  },
  {
    iconKey: "wards",
    title: "Ward & Bed Management",
    description:
      "Live occupancy across wards with capacity alerts for administrators.",
    source: "abecca_admin",
  },
  {
    iconKey: "billing",
    title: "Billing & Tariffs",
    description:
      "Procedure tariffs in IDR drive patient invoices and revenue tracking.",
    source: "core_engine · seeder.rs (tariffs)",
  },
  {
    iconKey: "pharmacy",
    title: "Pharmacy Formulary",
    description:
      "Medication stock with automatic reorder-level signalling.",
    source: "core_engine · seeder.rs (formulary)",
  },
  {
    iconKey: "staff",
    title: "Staff Directory",
    description: "Clinical and operational staff with live shift status.",
    source: "abecca_admin",
  },
  {
    iconKey: "data",
    title: "Distributed Data Layer",
    description: "PostgreSQL, Redis and Qdrant power persistence and vector search.",
    source: "docker-compose · infrastructure/",
  },
];

export interface Scenario {
  id: string;
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  minutes: number;
  summary: string;
  steps: string[];
}

export const scenarios: Scenario[] = [
  {
    id: "triage",
    title: "Emergency Triage Walkthrough",
    level: "Beginner",
    minutes: 8,
    summary:
      "Admit a patient, capture vitals, and watch the Early Warning Score classify acuity.",
    steps: [
      "Open the clinical portal and create a new admission",
      "Record heart rate, blood pressure, SpO₂ and temperature",
      "Observe the EWS gauge and acuity band update",
      "Confirm the admission appears on the critical watchlist",
    ],
  },
  {
    id: "audit",
    title: "Verifying the Audit Chain",
    level: "Intermediate",
    minutes: 12,
    summary:
      "Follow a record change through the blockchain and confirm chain integrity.",
    steps: [
      "Update a patient diagnosis in the clinical portal",
      "Open the Audit Trail and locate the new block",
      "Inspect how its hash links to the previous block",
      "Run the integrity check (is_chain_valid)",
    ],
  },
  {
    id: "billing",
    title: "Building a Patient Invoice",
    level: "Intermediate",
    minutes: 10,
    summary:
      "Assemble an invoice from the tariff catalogue and track its payment status.",
    steps: [
      "Open Billing in the admin portal",
      "Add procedure tariffs to a new invoice",
      "Review the IDR total",
      "Mark the invoice paid and watch revenue update",
    ],
  },
  {
    id: "capacity",
    title: "Managing Ward Capacity",
    level: "Advanced",
    minutes: 15,
    summary:
      "Balance bed occupancy across wards and respond to capacity alerts.",
    steps: [
      "Review occupancy on the Wards screen",
      "Identify a ward above 90% capacity",
      "Plan a transfer to a ward with availability",
      "Confirm the occupancy bars rebalance",
    ],
  },
];

export const sandboxInfo = {
  resetCadence: "Nightly at 00:00",
  dataState: "Synthetic — no real patient data",
  environment: "Isolated training instance",
};

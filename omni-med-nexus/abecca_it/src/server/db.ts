/**
 * Server datastore for the Abecca IT operations BFF.
 *
 * Two interchangeable backends behind one async API:
 *   - Supabase (db-supabase.ts) when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *     are set — durable, shared across serverless instances. Tables are created
 *     by supabase/migrations/0001_it_ops_tables.sql and seeded from
 *     supabase/seed.sql.
 *   - An in-memory process-global singleton otherwise — the zero-config
 *     preview/dev default; resets on restart.
 *
 * The HTTP contract is identical either way, so route handlers and the client
 * never change. Services map to real components of the stack
 * (docker-compose.yml, core_engine, the web apps); incidents and security
 * controls are the operational layer IT manages.
 */

import type {
  Incident,
  SecurityControl,
  Service,
  ServiceStatus,
  Severity,
} from "@/lib/data";
import {
  incidents as seedIncidents,
  securityControls as seedControls,
  services as seedServices,
} from "@/lib/data";
import { getSupabase } from "./supabase";
import * as supa from "./db-supabase";

export type IncidentStatus = Incident["status"];

/* ============================ in-memory backend ============================ */

type DB = {
  services: Service[];
  incidents: Incident[];
  controls: SecurityControl[];
};

function build(): DB {
  return {
    services: seedServices.map((s) => ({ ...s })),
    incidents: seedIncidents.map((i) => ({ ...i })),
    controls: seedControls.map((c) => ({ ...c })),
  };
}

const g = globalThis as unknown as { __abeccaItDb?: DB };
const db: DB = g.__abeccaItDb ?? (g.__abeccaItDb = build());

const STATUS_CYCLE: ServiceStatus[] = [
  "operational",
  "degraded",
  "down",
  "maintenance",
];

const memory = {
  getServices: (): Service[] => db.services,
  getIncidents: (): Incident[] => db.incidents,
  getControls: (): SecurityControl[] => db.controls,

  cycleServiceStatus: (id: string): Service | undefined => {
    const s = db.services.find((x) => x.id === id);
    if (!s) return undefined;
    s.status =
      STATUS_CYCLE[(STATUS_CYCLE.indexOf(s.status) + 1) % STATUS_CYCLE.length];
    return s;
  },

  setServiceStatus: (id: string, status: ServiceStatus): Service | undefined => {
    const s = db.services.find((x) => x.id === id);
    if (!s) return undefined;
    s.status = status;
    return s;
  },

  setIncidentStatus: (id: string, status: IncidentStatus): Incident | undefined => {
    const inc = db.incidents.find((i) => i.id === id);
    if (!inc) return undefined;
    inc.status = status;
    return inc;
  },

  createIncident: (service: string, severity: Severity, title: string): Incident => {
    const maxNum = db.incidents.reduce((m, i) => {
      const n = Number(i.id.replace(/\D/g, ""));
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 1000);
    const incident: Incident = {
      id: `INC-${maxNum + 1}`,
      title,
      severity,
      service,
      status: "open",
      openedAt: new Date().toISOString(),
    };
    db.incidents = [incident, ...db.incidents];
    return incident;
  },

  toggleControl: (id: string): SecurityControl | undefined => {
    const c = db.controls.find((x) => x.id === id);
    if (!c) return undefined;
    c.status = c.status === "enforced" ? "review" : "enforced";
    return c;
  },
};

/* ============================== public API ================================ */
/* Async everywhere; delegates to Supabase when configured, else in-memory.   */

export async function getServices(): Promise<Service[]> {
  const sb = getSupabase();
  return sb ? supa.getServices(sb) : memory.getServices();
}

export async function getIncidents(): Promise<Incident[]> {
  const sb = getSupabase();
  return sb ? supa.getIncidents(sb) : memory.getIncidents();
}

export async function getControls(): Promise<SecurityControl[]> {
  const sb = getSupabase();
  return sb ? supa.getControls(sb) : memory.getControls();
}

export async function cycleServiceStatus(id: string): Promise<Service | undefined> {
  const sb = getSupabase();
  return sb ? supa.cycleServiceStatus(sb, id) : memory.cycleServiceStatus(id);
}

export async function setServiceStatus(
  id: string,
  status: ServiceStatus,
): Promise<Service | undefined> {
  const sb = getSupabase();
  return sb ? supa.setServiceStatus(sb, id, status) : memory.setServiceStatus(id, status);
}

export async function setIncidentStatus(
  id: string,
  status: IncidentStatus,
): Promise<Incident | undefined> {
  const sb = getSupabase();
  return sb ? supa.setIncidentStatus(sb, id, status) : memory.setIncidentStatus(id, status);
}

export async function createIncident(
  service: string,
  severity: Severity,
  title: string,
): Promise<Incident> {
  const sb = getSupabase();
  return sb
    ? supa.createIncident(sb, service, severity, title)
    : memory.createIncident(service, severity, title);
}

export async function toggleControl(id: string): Promise<SecurityControl | undefined> {
  const sb = getSupabase();
  return sb ? supa.toggleControl(sb, id) : memory.toggleControl(id);
}

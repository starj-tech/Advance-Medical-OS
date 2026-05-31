/**
 * In-memory server datastore for the Abecca IT operations BFF.
 *
 * Real HTTP route handlers read and write this store. Services map to real
 * components of the stack (docker-compose.yml, core_engine, the web apps);
 * incidents and security controls are the operational layer IT manages.
 *
 * Process-global singleton so state survives across requests (and HMR);
 * resets on restart.
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

export type IncidentStatus = Incident["status"];

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

/* ---------------------------------- reads --------------------------------- */

export function getServices(): Service[] {
  return db.services;
}
export function getIncidents(): Incident[] {
  return db.incidents;
}
export function getControls(): SecurityControl[] {
  return db.controls;
}

/* -------------------------------- services -------------------------------- */

const STATUS_CYCLE: ServiceStatus[] = [
  "operational",
  "degraded",
  "down",
  "maintenance",
];

export function cycleServiceStatus(id: string): Service | undefined {
  const s = db.services.find((x) => x.id === id);
  if (!s) return undefined;
  s.status =
    STATUS_CYCLE[(STATUS_CYCLE.indexOf(s.status) + 1) % STATUS_CYCLE.length];
  return s;
}

export function setServiceStatus(
  id: string,
  status: ServiceStatus,
): Service | undefined {
  const s = db.services.find((x) => x.id === id);
  if (!s) return undefined;
  s.status = status;
  return s;
}

/* -------------------------------- incidents ------------------------------- */

export function setIncidentStatus(
  id: string,
  status: IncidentStatus,
): Incident | undefined {
  const inc = db.incidents.find((i) => i.id === id);
  if (!inc) return undefined;
  inc.status = status;
  return inc;
}

export function createIncident(
  service: string,
  severity: Severity,
  title: string,
): Incident {
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
}

/* -------------------------------- security -------------------------------- */

export function toggleControl(id: string): SecurityControl | undefined {
  const c = db.controls.find((x) => x.id === id);
  if (!c) return undefined;
  c.status = c.status === "enforced" ? "review" : "enforced";
  return c;
}

"use client";

/**
 * In-memory IT-ops store. Holds incidents, services and security controls so
 * the console performs real actions: acknowledge/resolve incidents, change a
 * service's status (which feeds the live health summary), raise an incident
 * from a service, and flip security controls. useSyncExternalStore, seeded
 * eagerly from the data layer; in memory only (resets on reload).
 */

import { useSyncExternalStore } from "react";
import type {
  Incident,
  SecurityControl,
  Service,
  ServiceStatus,
  Severity,
} from "./data";
import {
  incidents as seedIncidents,
  securityControls as seedControls,
  services as seedServices,
} from "./data";

export type IncidentStatus = Incident["status"];

type State = {
  incidents: Incident[];
  services: Service[];
  controls: SecurityControl[];
};

let state: State = {
  incidents: seedIncidents.map((i) => ({ ...i })),
  services: seedServices.map((s) => ({ ...s })),
  controls: seedControls.map((c) => ({ ...c })),
};

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/* ------------------------------- incidents -------------------------------- */

function setStatus(id: string, status: IncidentStatus) {
  state = {
    ...state,
    incidents: state.incidents.map((i) =>
      i.id === id ? { ...i, status } : i,
    ),
  };
  emit();
}

export const acknowledgeIncident = (id: string) => setStatus(id, "monitoring");
export const resolveIncident = (id: string) => setStatus(id, "resolved");
export const reopenIncident = (id: string) => setStatus(id, "open");

/** Raise a new incident against a service (used from the Services screen). */
export function createIncident(
  service: string,
  severity: Severity,
  title: string,
) {
  const maxNum = state.incidents.reduce((m, i) => {
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
  state = { ...state, incidents: [incident, ...state.incidents] };
  emit();
}

/* -------------------------------- services -------------------------------- */

const STATUS_CYCLE: ServiceStatus[] = [
  "operational",
  "degraded",
  "down",
  "maintenance",
];

/** Advance a service to the next status in the cycle (manual ops override). */
export function cycleServiceStatus(id: string) {
  state = {
    ...state,
    services: state.services.map((s) => {
      if (s.id !== id) return s;
      const next =
        STATUS_CYCLE[(STATUS_CYCLE.indexOf(s.status) + 1) % STATUS_CYCLE.length];
      return { ...s, status: next };
    }),
  };
  emit();
}

export function setServiceStatus(id: string, status: ServiceStatus) {
  state = {
    ...state,
    services: state.services.map((s) => (s.id === id ? { ...s, status } : s)),
  };
  emit();
}

/* ----------------------------- security ----------------------------------- */

export function toggleControl(id: string) {
  state = {
    ...state,
    controls: state.controls.map((c) =>
      c.id === id
        ? { ...c, status: c.status === "enforced" ? "review" : "enforced" }
        : c,
    ),
  };
  emit();
}

/* --------------------------------- hooks ---------------------------------- */

const getIncidents = () => state.incidents;
const getServices = () => state.services;
const getControls = () => state.controls;

export function useIncidents(): Incident[] {
  return useSyncExternalStore(subscribe, getIncidents, getIncidents);
}
export function useServices(): Service[] {
  return useSyncExternalStore(subscribe, getServices, getServices);
}
export function useControls(): SecurityControl[] {
  return useSyncExternalStore(subscribe, getControls, getControls);
}

/** Health summary recomputed live from current services + incidents. */
export function useItOverview() {
  const inc = useIncidents();
  const svc = useServices();
  const operational = svc.filter((s) => s.status === "operational").length;
  const avgUptime = svc.length
    ? svc.reduce((s, x) => s + x.uptime, 0) / svc.length
    : 0;
  return {
    total: svc.length,
    operational,
    degraded: svc.filter((s) => s.status === "degraded").length,
    down: svc.filter((s) => s.status === "down").length,
    maintenance: svc.filter((s) => s.status === "maintenance").length,
    avgUptime,
    openIncidents: inc.filter((i) => i.status !== "resolved").length,
  };
}

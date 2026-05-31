"use client";

/**
 * Client store for the Abecca IT operations console — wired to the HTTP API.
 *
 * Eager seed gives SSR/first paint fully-populated state; on first subscription
 * the store revalidates from /api, and every mutation calls the API then pulls
 * authoritative state. Point NEXT_PUBLIC_API_BASE_URL at the Rust core-engine
 * API to switch backends without touching a screen.
 */

import { useSyncExternalStore } from "react";
import type { Incident, SecurityControl, Service, Severity } from "./data";
import {
  incidents as seedIncidents,
  securityControls as seedControls,
  services as seedServices,
} from "./data";
import { api } from "./api";

export type IncidentStatus = Incident["status"];

type State = {
  services: Service[];
  incidents: Incident[];
  controls: SecurityControl[];
};

let state: State = {
  services: seedServices.map((s) => ({ ...s })),
  incidents: seedIncidents.map((i) => ({ ...i })),
  controls: seedControls.map((c) => ({ ...c })),
};

const listeners = new Set<() => void>();
let revalidated = false;

function setState(next: State) {
  state = next;
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (!revalidated) {
    revalidated = true;
    void pull();
  }
  return () => listeners.delete(cb);
}

async function pull() {
  try {
    const [services, incidents, controls] = await Promise.all([
      api.services(),
      api.incidents(),
      api.controls(),
    ]);
    setState({ services, incidents, controls });
  } catch {
    // keep current snapshot if the API is unreachable
  }
}

/* -------------------------------- incidents ------------------------------- */

const setIncident = async (id: string, status: IncidentStatus) => {
  await api.setIncidentStatus(id, status);
  await pull();
};

export const acknowledgeIncident = (id: string) => setIncident(id, "monitoring");
export const resolveIncident = (id: string) => setIncident(id, "resolved");
export const reopenIncident = (id: string) => setIncident(id, "open");

export async function createIncident(
  service: string,
  severity: Severity,
  title: string,
) {
  await api.createIncident(service, severity, title);
  await pull();
}

/* -------------------------------- services -------------------------------- */

export async function cycleServiceStatus(id: string) {
  await api.cycleService(id);
  await pull();
}

/* -------------------------------- security -------------------------------- */

export async function toggleControl(id: string) {
  await api.toggleControl(id);
  await pull();
}

/* --------------------------------- hooks ---------------------------------- */

const getServices = () => state.services;
const getIncidents = () => state.incidents;
const getControls = () => state.controls;

export function useServices(): Service[] {
  return useSyncExternalStore(subscribe, getServices, getServices);
}
export function useIncidents(): Incident[] {
  return useSyncExternalStore(subscribe, getIncidents, getIncidents);
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

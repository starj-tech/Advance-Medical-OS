"use client";

/**
 * In-memory IT-ops store. Holds incidents so acknowledge / resolve actions
 * update the console live (including the open-incident count on the overview).
 * useSyncExternalStore, seeded eagerly from the data layer; in memory only.
 */

import { useSyncExternalStore } from "react";
import type { Incident } from "./data";
import { incidents as seedIncidents, services } from "./data";

export type IncidentStatus = Incident["status"];

let incidents: Incident[] = seedIncidents.map((i) => ({ ...i }));
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function setStatus(id: string, status: IncidentStatus) {
  incidents = incidents.map((i) => (i.id === id ? { ...i, status } : i));
  for (const l of listeners) l();
}

export const acknowledgeIncident = (id: string) => setStatus(id, "monitoring");
export const resolveIncident = (id: string) => setStatus(id, "resolved");
export const reopenIncident = (id: string) => setStatus(id, "open");

const getIncidentsSnapshot = () => incidents;

export function useIncidents(): Incident[] {
  return useSyncExternalStore(
    subscribe,
    getIncidentsSnapshot,
    getIncidentsSnapshot,
  );
}

/** Service health is static; incident counts are live from the store. */
export function useItOverview() {
  const inc = useIncidents();
  const operational = services.filter((s) => s.status === "operational").length;
  const avgUptime = services.reduce((s, x) => s + x.uptime, 0) / services.length;
  return {
    total: services.length,
    operational,
    degraded: services.filter((s) => s.status === "degraded").length,
    down: services.filter((s) => s.status === "down").length,
    maintenance: services.filter((s) => s.status === "maintenance").length,
    avgUptime,
    openIncidents: inc.filter((i) => i.status !== "resolved").length,
  };
}

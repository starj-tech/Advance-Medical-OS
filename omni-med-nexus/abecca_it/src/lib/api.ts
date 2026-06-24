/**
 * Typed HTTP client for the Abecca IT operations API (Next.js BFF under /api).
 * Base URL via NEXT_PUBLIC_API_BASE_URL so it can later target the Rust API.
 */

import type { Incident, SecurityControl, Service, Severity } from "./data";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "content-type": "application/json" },
    cache: "no-store",
    ...init,
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  services: () => request<Service[]>("/services"),
  cycleService: (id: string) =>
    request<Service>(`/services/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ op: "cycle" }),
    }),
  incidents: () => request<Incident[]>("/incidents"),
  createIncident: (service: string, severity: Severity, title: string) =>
    request<Incident>("/incidents", {
      method: "POST",
      body: JSON.stringify({ service, severity, title }),
    }),
  setIncidentStatus: (id: string, status: Incident["status"]) =>
    request<Incident>(`/incidents/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  controls: () => request<SecurityControl[]>("/controls"),
  toggleControl: (id: string) =>
    request<SecurityControl>(`/controls/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ op: "toggle" }),
    }),
};

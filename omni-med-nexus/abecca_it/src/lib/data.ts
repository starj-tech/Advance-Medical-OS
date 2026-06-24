/**
 * Operational data for the Abecca IT operations console. Every service shown
 * maps to a real component of the stack defined in docker-compose.yml,
 * core_engine/, and the deployed web apps.
 */

export type ServiceStatus = "operational" | "degraded" | "down" | "maintenance";

export interface Service {
  id: string;
  name: string;
  kind: "Datastore" | "Engine" | "Web App" | "Infrastructure";
  status: ServiceStatus;
  uptime: number; // percent over 30d
  latencyMs: number;
  detail: string;
}

export const services: Service[] = [
  { id: "postgres", name: "PostgreSQL 15", kind: "Datastore", status: "operational", uptime: 99.98, latencyMs: 4, detail: "Primary relational store (patients, tariffs, formulary)" },
  { id: "redis", name: "Redis 7", kind: "Datastore", status: "operational", uptime: 99.99, latencyMs: 1, detail: "Cache & session store" },
  { id: "qdrant", name: "Qdrant", kind: "Datastore", status: "degraded", uptime: 99.21, latencyMs: 38, detail: "Vector search — elevated latency on collection rebuild" },
  { id: "core", name: "Core Engine", kind: "Engine", status: "operational", uptime: 99.95, latencyMs: 6, detail: "Rust library: encryption, audit chain, DB pools" },
  { id: "main", name: "abecca_main", kind: "Web App", status: "operational", uptime: 100, latencyMs: 52, detail: "Clinical portal (public)" },
  { id: "admin", name: "abecca_admin", kind: "Web App", status: "operational", uptime: 99.97, latencyMs: 48, detail: "Hospital administration (internal)" },
  { id: "demo", name: "abecca_demo", kind: "Web App", status: "maintenance", uptime: 98.4, latencyMs: 0, detail: "Demo sandbox — nightly reset window" },
  { id: "it", name: "abecca_it", kind: "Web App", status: "operational", uptime: 99.99, latencyMs: 41, detail: "IT operations console (internal)" },
  { id: "vpc", name: "GCP VPC / Cloud SQL", kind: "Infrastructure", status: "operational", uptime: 99.99, latencyMs: 12, detail: "Terraform-managed, asia-southeast1" },
];

export type Severity = "info" | "warning" | "critical";

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  service: string;
  status: "open" | "monitoring" | "resolved";
  openedAt: string;
}

export const incidents: Incident[] = [
  { id: "INC-1042", title: "Qdrant latency above threshold", severity: "warning", service: "Qdrant", status: "monitoring", openedAt: "2026-05-30T04:10:00Z" },
  { id: "INC-1041", title: "Demo sandbox scheduled maintenance", severity: "info", service: "abecca_demo", status: "open", openedAt: "2026-05-30T00:00:00Z" },
  { id: "INC-1038", title: "Postgres connection pool saturation", severity: "critical", service: "PostgreSQL 15", status: "resolved", openedAt: "2026-05-28T19:30:00Z" },
  { id: "INC-1035", title: "Elevated 5xx on clinical portal", severity: "warning", service: "abecca_main", status: "resolved", openedAt: "2026-05-27T11:15:00Z" },
];

export interface SecurityControl {
  id: string;
  name: string;
  status: "enforced" | "review";
  detail: string;
}

export const securityControls: SecurityControl[] = [
  { id: "aes", name: "AES-256-GCM encryption at rest", status: "enforced", detail: "Patient PII sealed in core_engine" },
  { id: "audit", name: "Tamper-evident audit chain", status: "enforced", detail: "SHA-256 hash-linked blocks; integrity verified" },
  { id: "headers", name: "HTTP security headers", status: "enforced", detail: "HSTS, X-Frame-Options, CSP-ready across all web apps" },
  { id: "key", name: "Production key management", status: "review", detail: "Core uses ephemeral key in tests; load from KMS in prod" },
];

export async function getServices(): Promise<Service[]> {
  return services;
}
export async function getIncidents(): Promise<Incident[]> {
  return incidents;
}
export async function getSecurityControls(): Promise<SecurityControl[]> {
  return securityControls;
}

export async function getItOverview() {
  const operational = services.filter((s) => s.status === "operational").length;
  const avgUptime =
    services.reduce((s, x) => s + x.uptime, 0) / services.length;
  return {
    total: services.length,
    operational,
    degraded: services.filter((s) => s.status === "degraded").length,
    down: services.filter((s) => s.status === "down").length,
    maintenance: services.filter((s) => s.status === "maintenance").length,
    avgUptime,
    openIncidents: incidents.filter((i) => i.status !== "resolved").length,
    controlsToReview: securityControls.filter((c) => c.status === "review").length,
  };
}

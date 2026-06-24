/**
 * Supabase-backed implementation of the IT operations datastore.
 *
 * Mirrors the in-memory store in db.ts one-to-one, so db.ts can delegate here
 * whenever Supabase is configured. Tables (services, incidents, controls) are
 * created by supabase/migrations/0001_it_ops_tables.sql and seeded from
 * supabase/seed.sql. numeric (uptime) comes back from PostgREST as a string and
 * is coerced here.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Incident,
  SecurityControl,
  Service,
  ServiceStatus,
  Severity,
} from "@/lib/data";

export type IncidentStatus = Incident["status"];

const STATUS_CYCLE: ServiceStatus[] = [
  "operational",
  "degraded",
  "down",
  "maintenance",
];

/* -------------------------------- row types ------------------------------- */

interface ServiceRow {
  id: string;
  name: string;
  kind: Service["kind"];
  status: ServiceStatus;
  uptime: string | number;
  latency_ms: number;
  detail: string;
}

interface IncidentRow {
  id: string;
  title: string;
  severity: Severity;
  service: string;
  status: IncidentStatus;
  opened_at: string;
}

interface ControlRow {
  id: string;
  name: string;
  status: SecurityControl["status"];
  detail: string;
}

/* --------------------------------- mappers -------------------------------- */

function rowToService(r: ServiceRow): Service {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    status: r.status,
    uptime: Number(r.uptime),
    latencyMs: r.latency_ms,
    detail: r.detail,
  };
}

function rowToIncident(r: IncidentRow): Incident {
  return {
    id: r.id,
    title: r.title,
    severity: r.severity,
    service: r.service,
    status: r.status,
    openedAt: r.opened_at,
  };
}

function rowToControl(r: ControlRow): SecurityControl {
  return { id: r.id, name: r.name, status: r.status, detail: r.detail };
}

/* ---------------------------------- reads --------------------------------- */

export async function getServices(sb: SupabaseClient): Promise<Service[]> {
  const { data } = await sb
    .from("services")
    .select("*")
    .order("id", { ascending: true })
    .returns<ServiceRow[]>();
  return (data ?? []).map(rowToService);
}

export async function getIncidents(sb: SupabaseClient): Promise<Incident[]> {
  const { data } = await sb
    .from("incidents")
    .select("*")
    .order("opened_at", { ascending: false })
    .order("id", { ascending: false })
    .returns<IncidentRow[]>();
  return (data ?? []).map(rowToIncident);
}

export async function getControls(sb: SupabaseClient): Promise<SecurityControl[]> {
  const { data } = await sb
    .from("controls")
    .select("*")
    .order("id", { ascending: true })
    .returns<ControlRow[]>();
  return (data ?? []).map(rowToControl);
}

/* -------------------------------- services -------------------------------- */

export async function cycleServiceStatus(
  sb: SupabaseClient,
  id: string,
): Promise<Service | undefined> {
  const { data } = await sb
    .from("services")
    .select("*")
    .eq("id", id)
    .maybeSingle<ServiceRow>();
  if (!data) return undefined;
  const status =
    STATUS_CYCLE[(STATUS_CYCLE.indexOf(data.status) + 1) % STATUS_CYCLE.length];
  await sb.from("services").update({ status }).eq("id", id);
  return rowToService({ ...data, status });
}

export async function setServiceStatus(
  sb: SupabaseClient,
  id: string,
  status: ServiceStatus,
): Promise<Service | undefined> {
  const { data } = await sb
    .from("services")
    .select("*")
    .eq("id", id)
    .maybeSingle<ServiceRow>();
  if (!data) return undefined;
  await sb.from("services").update({ status }).eq("id", id);
  return rowToService({ ...data, status });
}

/* -------------------------------- incidents ------------------------------- */

export async function setIncidentStatus(
  sb: SupabaseClient,
  id: string,
  status: IncidentStatus,
): Promise<Incident | undefined> {
  const { data } = await sb
    .from("incidents")
    .select("*")
    .eq("id", id)
    .maybeSingle<IncidentRow>();
  if (!data) return undefined;
  await sb.from("incidents").update({ status }).eq("id", id);
  return rowToIncident({ ...data, status });
}

export async function createIncident(
  sb: SupabaseClient,
  service: string,
  severity: Severity,
  title: string,
): Promise<Incident> {
  const { data: ids } = await sb
    .from("incidents")
    .select("id")
    .returns<{ id: string }[]>();
  const maxNum = (ids ?? []).reduce((m, row) => {
    const n = Number(row.id.replace(/\D/g, ""));
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
  await sb.from("incidents").insert({
    id: incident.id,
    title: incident.title,
    severity: incident.severity,
    service: incident.service,
    status: incident.status,
    opened_at: incident.openedAt,
  });
  return incident;
}

/* -------------------------------- security -------------------------------- */

export async function toggleControl(
  sb: SupabaseClient,
  id: string,
): Promise<SecurityControl | undefined> {
  const { data } = await sb
    .from("controls")
    .select("*")
    .eq("id", id)
    .maybeSingle<ControlRow>();
  if (!data) return undefined;
  const status = data.status === "enforced" ? "review" : "enforced";
  await sb.from("controls").update({ status }).eq("id", id);
  return rowToControl({ ...data, status });
}

/**
 * Structured application event log — the "observability lanjutan" layer over the
 * basic logging. Events are tenant-scoped by company_id (platform events may be
 * null) and carry a redacted `fields` bag. Env-gated: persisted to Supabase when
 * configured, else kept in a capped in-memory ring buffer (preview/dev). Emission
 * is best-effort — logEvent never throws, so instrumenting a hot path (e.g. the
 * authz guard) can never break the request it is observing.
 */
import { getSupabase } from "../supabase";
import { redactFields, type EventLevel } from "@/lib/observability";

export interface AppEvent {
  id: string;
  companyId: string | null;
  level: EventLevel;
  scope: string;
  message: string;
  userId: string | null;
  requestId: string | null;
  fields: Record<string, unknown>;
  createdAt: string;
}

const RING = 500;
const g = globalThis as unknown as { __abeccaEvents?: AppEvent[] };
const mem = g.__abeccaEvents ?? (g.__abeccaEvents = []);

type Row = {
  id: string; company_id: string | null; level: EventLevel; scope: string;
  message: string; user_id: string | null; request_id: string | null;
  fields: Record<string, unknown> | null; created_at: string;
};
const toEvent = (r: Row): AppEvent => ({
  id: r.id, companyId: r.company_id, level: r.level, scope: r.scope, message: r.message,
  userId: r.user_id, requestId: r.request_id, fields: r.fields ?? {}, createdAt: r.created_at,
});

export interface LogInput {
  level: EventLevel;
  scope: string;
  message: string;
  companyId?: string | null;
  userId?: string | null;
  requestId?: string | null;
  fields?: Record<string, unknown>;
}

/** Record a structured event. Best-effort: any failure is swallowed. */
export async function logEvent(input: LogInput): Promise<void> {
  try {
    const fields = input.fields ? redactFields(input.fields) : {};
    const sb = getSupabase();
    if (sb) {
      await sb.from("app_events").insert({
        company_id: input.companyId ?? null,
        level: input.level,
        scope: input.scope,
        message: input.message,
        user_id: input.userId ?? null,
        request_id: input.requestId ?? null,
        fields,
      });
      return;
    }
    mem.push({
      id: crypto.randomUUID(),
      companyId: input.companyId ?? null,
      level: input.level,
      scope: input.scope,
      message: input.message,
      userId: input.userId ?? null,
      requestId: input.requestId ?? null,
      fields,
      createdAt: new Date().toISOString(),
    });
    if (mem.length > RING) mem.splice(0, mem.length - RING);
  } catch {
    // Observability must never break the path it observes.
  }
}

export interface ListOpts {
  level?: EventLevel;
  scope?: string;
  limit?: number;
}

/** Recent events for a tenant, newest first. */
export async function listEvents(companyId: string, opts: ListOpts = {}): Promise<AppEvent[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("app_events").select("*").eq("company_id", companyId);
    if (opts.level) q = q.eq("level", opts.level);
    if (opts.scope) q = q.eq("scope", opts.scope);
    const { data } = await q.order("created_at", { ascending: false }).limit(limit);
    return (data ?? []).map((r) => toEvent(r as Row));
  }
  return mem
    .filter(
      (e) =>
        e.companyId === companyId &&
        (!opts.level || e.level === opts.level) &&
        (!opts.scope || e.scope === opts.scope),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export interface EventMetrics {
  total: number;
  byLevel: Record<EventLevel, number>;
  byScope: Record<string, number>;
  errorRate: number;
  lastEventAt: string | null;
}

/** Roll up the recent events for a tenant into level/scope counts + error rate. */
export async function eventMetrics(companyId: string): Promise<EventMetrics> {
  const events = await listEvents(companyId, { limit: 500 });
  const byLevel: Record<EventLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 };
  const byScope: Record<string, number> = {};
  for (const e of events) {
    byLevel[e.level] += 1;
    byScope[e.scope] = (byScope[e.scope] ?? 0) + 1;
  }
  const total = events.length;
  return {
    total,
    byLevel,
    byScope,
    errorRate: total ? byLevel.error / total : 0,
    lastEventAt: events[0]?.createdAt ?? null,
  };
}

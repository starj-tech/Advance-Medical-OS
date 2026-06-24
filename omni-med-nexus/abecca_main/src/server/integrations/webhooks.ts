/**
 * Outgoing webhooks. A tenant registers endpoint URLs subscribed to domain events;
 * when such an event fires, each subscribed endpoint receives a signed POST. The
 * shared secret (whsec_…) is shown once and kept to sign deliveries (HMAC-SHA256
 * over `${timestamp}.${body}`, see webhook-sign). Delivery is best-effort and never
 * throws into the caller; outcomes are recorded as observability events. Tenant-
 * scoped; env-gated (Supabase or in-memory).
 */
import { randomBytes } from "node:crypto";
import { getSupabase } from "../supabase";
import { signWebhook } from "./webhook-sign";
import { logEvent } from "../observability/log";
import { normalizeEvents, type WebhookEvent } from "@/lib/webhook-events";

export interface WebhookView {
  id: string;
  companyId: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  secretMasked: string;
  createdAt: string;
  lastStatus: number | null;
  lastDeliveryAt: string | null;
}

interface WebhookRow {
  id: string;
  company_id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  active: boolean;
  created_at: string;
  last_status: number | null;
  last_delivery_at: string | null;
}
const maskSecret = (s: string): string => `${s.slice(0, 10)}…${s.slice(-4)}`;
const toView = (r: WebhookRow): WebhookView => ({
  id: r.id, companyId: r.company_id, url: r.url, events: r.events, active: r.active,
  secretMasked: maskSecret(r.secret), createdAt: r.created_at,
  lastStatus: r.last_status, lastDeliveryAt: r.last_delivery_at,
});

const g = globalThis as unknown as { __abeccaWebhooks?: WebhookRow[] };
const mem = g.__abeccaWebhooks ?? (g.__abeccaWebhooks = []);

/** A built delivery — pure, so the signature can be asserted in tests. */
export interface WebhookDelivery {
  url: string;
  headers: Record<string, string>;
  body: string;
}
export function buildDelivery(
  endpoint: { url: string; secret: string },
  event: WebhookEvent | "ping",
  payload: unknown,
  deliveryId: string,
  timestamp: string,
): WebhookDelivery {
  const body = JSON.stringify({ id: deliveryId, event, createdAt: timestamp, data: payload });
  return {
    url: endpoint.url,
    headers: {
      "content-type": "application/json",
      "user-agent": "Abecca-Webhooks/1.0",
      "X-Abecca-Event": event,
      "X-Abecca-Webhook-Id": deliveryId,
      "X-Abecca-Webhook-Timestamp": timestamp,
      "X-Abecca-Signature": signWebhook(endpoint.secret, timestamp, body),
    },
    body,
  };
}

export async function registerWebhook(
  companyId: string,
  input: { url: string; events: unknown },
): Promise<{ view: WebhookView; secret: string } | { error: string }> {
  const url = typeof input.url === "string" ? input.url.trim() : "";
  if (!/^https:\/\/.+/i.test(url)) return { error: "URL harus diawali https://" };
  const events = normalizeEvents(input.events);
  if (events.length === 0) return { error: "Pilih minimal satu event" };
  const secret = `whsec_${randomBytes(24).toString("base64url")}`;
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("webhook_endpoints")
      .insert({ company_id: companyId, url, secret, events, active: true })
      .select("*")
      .single();
    if (error || !data) return { error: error?.message ?? "register webhook failed" };
    return { view: toView(data as WebhookRow), secret };
  }
  const row: WebhookRow = {
    id: crypto.randomUUID(), company_id: companyId, url, secret, events, active: true,
    created_at: new Date().toISOString(), last_status: null, last_delivery_at: null,
  };
  mem.push(row);
  return { view: toView(row), secret };
}

export async function listWebhooks(companyId: string): Promise<WebhookView[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("webhook_endpoints").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    return (data ?? []).map((r) => toView(r as WebhookRow));
  }
  return mem
    .filter((r) => r.company_id === companyId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(toView);
}

export async function deleteWebhook(companyId: string, id: string): Promise<boolean> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("webhook_endpoints").delete().eq("company_id", companyId).eq("id", id).select("id").maybeSingle();
    return !!data;
  }
  const i = mem.findIndex((r) => r.company_id === companyId && r.id === id);
  if (i < 0) return false;
  mem.splice(i, 1);
  return true;
}

async function getRows(companyId: string, event?: WebhookEvent): Promise<WebhookRow[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("webhook_endpoints").select("*").eq("company_id", companyId).eq("active", true);
    const rows = (data ?? []) as WebhookRow[];
    return event ? rows.filter((r) => r.events.includes(event)) : rows;
  }
  return mem.filter((r) => r.company_id === companyId && r.active && (!event || r.events.includes(event)));
}

async function recordStatus(id: string, status: number | null): Promise<void> {
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    await sb.from("webhook_endpoints").update({ last_status: status, last_delivery_at: now }).eq("id", id);
    return;
  }
  const row = mem.find((r) => r.id === id);
  if (row) { row.last_status = status; row.last_delivery_at = now; }
}

/** POST a built delivery best-effort; returns the HTTP status, or null on error. */
async function send(d: WebhookDelivery): Promise<number | null> {
  try {
    const res = await fetch(d.url, { method: "POST", headers: d.headers, body: d.body });
    return res.status;
  } catch {
    return null;
  }
}

/** Dispatch an event to every active subscribed endpoint. Best-effort; returns count. */
export async function dispatchWebhooks(
  companyId: string,
  event: WebhookEvent,
  payload: unknown,
): Promise<number> {
  const rows = await getRows(companyId, event);
  const ts = new Date().toISOString();
  await Promise.all(
    rows.map(async (r) => {
      const status = await send(buildDelivery(r, event, payload, crypto.randomUUID(), ts));
      await recordStatus(r.id, status);
      await logEvent({
        level: status && status < 400 ? "info" : "warn",
        scope: "integration",
        message: `Webhook ${event} → ${status ?? "gagal"}`,
        companyId,
        fields: { event, status, url: r.url },
      });
    }),
  );
  return rows.length;
}

/** Send a one-off `ping` to a single endpoint (the dashboard "test" button). */
export async function testWebhook(
  companyId: string,
  id: string,
): Promise<{ status: number | null } | { error: string }> {
  const rows = await getRows(companyId);
  const row = rows.find((r) => r.id === id) ?? mem.find((r) => r.company_id === companyId && r.id === id);
  if (!row) return { error: "Endpoint tidak ditemukan" };
  const ts = new Date().toISOString();
  const status = await send(buildDelivery(row, "ping", { message: "Halo dari Abecca" }, crypto.randomUUID(), ts));
  await recordStatus(row.id, status);
  return { status };
}

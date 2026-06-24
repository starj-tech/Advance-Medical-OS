"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Send, Trash2, Webhook } from "lucide-react";
import type { ApiKeyView } from "@/server/integrations/api-keys";
import type { WebhookView } from "@/server/integrations/webhooks";
import { WEBHOOK_EVENTS, WEBHOOK_EVENT_LABEL, type WebhookEvent } from "@/lib/webhook-events";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

export function IntegrationsView() {
  const [keys, setKeys] = useState<ApiKeyView[]>([]);
  const [hooks, setHooks] = useState<WebhookView[]>([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const [hookUrl, setHookUrl] = useState("");
  const [hookEvents, setHookEvents] = useState<WebhookEvent[]>([]);
  const [hookBusy, setHookBusy] = useState(false);
  const [freshSecret, setFreshSecret] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    const res = await fetch("/api/integrations/keys");
    setKeys(res.ok ? await res.json() : []);
  }, []);
  const loadHooks = useCallback(async () => {
    const res = await fetch("/api/integrations/webhooks");
    setHooks(res.ok ? await res.json() : []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
    void loadKeys();
    void loadHooks();
  }, [loadKeys, loadHooks]);

  const issue = async () => {
    setBusy(true);
    const res = await fetch("/api/integrations/keys", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: label.trim() || "API key" }),
    });
    setBusy(false);
    if (res.ok) { setFreshKey((await res.json()).key); setLabel(""); await loadKeys(); }
  };
  const revokeKey = async (id: string) => {
    if ((await fetch(`/api/integrations/keys/${id}`, { method: "DELETE" })).ok) await loadKeys();
  };

  const toggleEvent = (e: WebhookEvent) =>
    setHookEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  const registerHook = async () => {
    setHookBusy(true);
    const res = await fetch("/api/integrations/webhooks", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: hookUrl.trim(), events: hookEvents }),
    });
    setHookBusy(false);
    if (res.ok) {
      setFreshSecret((await res.json()).secret);
      setHookUrl(""); setHookEvents([]);
      await loadHooks();
    }
  };
  const deleteHook = async (id: string) => {
    if ((await fetch(`/api/integrations/webhooks/${id}`, { method: "DELETE" })).ok) await loadHooks();
  };
  const testHook = async (id: string) => {
    await fetch(`/api/integrations/webhooks/${id}/test`, { method: "POST" });
    await loadHooks();
  };

  const activeKeys = keys.filter((k) => !k.revokedAt);

  return (
    <Can permission="integration:manage" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke integrasi.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Integrasi & API Publik</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Terbitkan API key untuk mengakses data tenant dari sistem pihak ketiga, dan daftarkan
            webhook untuk menerima notifikasi event secara real-time.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" /> API Keys
            </CardTitle>
            <Badge variant={activeKeys.length ? "info" : "muted"}>{activeKeys.length} aktif</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {freshKey && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">API key baru (tampil sekali)</p>
                <p className="mt-0.5 break-all font-mono text-sm font-semibold text-primary">{freshKey}</p>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Label</span>
                <input className={inputCls} value={label} placeholder="mis. Integrasi SIMRS"
                  onChange={(e) => setLabel(e.target.value)} aria-label="Label API key" />
              </label>
              <Button onClick={issue} disabled={busy}><Plus className="size-4" /> Terbitkan key</Button>
            </div>
            {keys.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {keys.map((k) => (
                  <li key={k.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{k.label}</span>
                        <span className="font-mono text-xs text-muted-foreground">{k.keyPrefix}</span>
                        {k.revokedAt ? <Badge variant="danger">Dicabut</Badge> : <Badge variant="success">Aktif</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Dibuat {formatDateTime(k.createdAt)}
                        {k.lastUsedAt ? ` · Terakhir dipakai ${formatDateTime(k.lastUsedAt)}` : " · Belum dipakai"}
                      </p>
                    </div>
                    {!k.revokedAt && (
                      <Button size="sm" variant="ghost" onClick={() => revokeKey(k.id)}>
                        <Trash2 className="size-4" /> Cabut
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="overflow-x-auto rounded-lg bg-muted px-3 py-2.5 font-mono text-xs">
              <p>GET {origin}/api/public/v1/me</p>
              <p>GET {origin}/api/public/v1/appointments</p>
              <p className="mt-1 text-muted-foreground">Header: Authorization: Bearer &lt;API_KEY&gt; · 120 req/menit</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="size-4 text-primary" /> Webhooks
            </CardTitle>
            <Badge variant={hooks.length ? "info" : "muted"}>{hooks.length}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {freshSecret && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Signing secret (tampil sekali)</p>
                <p className="mt-0.5 break-all font-mono text-sm font-semibold text-primary">{freshSecret}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Verifikasi tiap delivery dengan header <span className="font-mono">X-Abecca-Signature</span> = sha256(secret, `timestamp.body`).
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">URL endpoint (https)</span>
                <input className={inputCls} value={hookUrl} placeholder="https://contoh.co.id/webhooks/abecca"
                  onChange={(e) => setHookUrl(e.target.value)} aria-label="URL webhook" />
              </label>
              <div className="flex flex-wrap gap-3">
                {WEBHOOK_EVENTS.map((ev) => (
                  <label key={ev} className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={hookEvents.includes(ev)} onChange={() => toggleEvent(ev)} />
                    {WEBHOOK_EVENT_LABEL[ev]}
                  </label>
                ))}
              </div>
              <div>
                <Button onClick={registerHook} disabled={hookBusy || !hookUrl.trim() || hookEvents.length === 0}>
                  <Plus className="size-4" /> Daftarkan webhook
                </Button>
              </div>
            </div>
            {hooks.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {hooks.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{h.url}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {h.events.map((e) => (
                          <span key={e} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{e}</span>
                        ))}
                        {h.lastStatus != null && (
                          <span>· Terakhir: HTTP {h.lastStatus}</span>
                        )}
                      </p>
                    </div>
                    <span className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => testHook(h.id)}>
                        <Send className="size-4" /> Tes
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteHook(h.id)}>
                        <Trash2 className="size-4" /> Hapus
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </Can>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Trash2, Webhook } from "lucide-react";
import type { ApiKeyView } from "@/server/integrations/api-keys";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

export function IntegrationsView() {
  const [keys, setKeys] = useState<ApiKeyView[]>([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/integrations/keys");
    setKeys(res.ok ? await res.json() : []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
    void load();
  }, [load]);

  const issue = async () => {
    setBusy(true);
    const res = await fetch("/api/integrations/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: label.trim() || "API key" }),
    });
    setBusy(false);
    if (res.ok) {
      const j = await res.json();
      setFreshKey(j.key);
      setLabel("");
      await load();
    }
  };

  const revoke = async (id: string) => {
    const res = await fetch(`/api/integrations/keys/${id}`, { method: "DELETE" });
    if (res.ok) await load();
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
            Terbitkan API key untuk mengakses data tenant Anda dari sistem pihak ketiga melalui REST API.
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
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Salin & simpan sekarang — kunci ini tidak dapat ditampilkan ulang.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Label</span>
                <input className={inputCls} value={label} placeholder="mis. Integrasi SIMRS"
                  onChange={(e) => setLabel(e.target.value)} aria-label="Label API key" />
              </label>
              <Button onClick={issue} disabled={busy}>
                <Plus className="size-4" /> Terbitkan key
              </Button>
            </div>

            {keys.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {keys.map((k) => (
                  <li key={k.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{k.label}</span>
                        <span className="font-mono text-xs text-muted-foreground">{k.keyPrefix}</span>
                        {k.revokedAt
                          ? <Badge variant="danger">Dicabut</Badge>
                          : <Badge variant="success">Aktif</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Dibuat {formatDateTime(k.createdAt)}
                        {k.lastUsedAt ? ` · Terakhir dipakai ${formatDateTime(k.lastUsedAt)}` : " · Belum dipakai"}
                      </p>
                    </div>
                    {!k.revokedAt && (
                      <Button size="sm" variant="ghost" onClick={() => revoke(k.id)}>
                        <Trash2 className="size-4" /> Cabut
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="size-4 text-primary" /> Referensi API
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              Sertakan header <span className="font-mono text-foreground">Authorization: Bearer &lt;API_KEY&gt;</span> pada setiap permintaan.
            </p>
            <div className="overflow-x-auto rounded-lg bg-muted px-3 py-2.5 font-mono text-xs">
              <p>GET {origin}/api/public/v1/me</p>
              <p>GET {origin}/api/public/v1/appointments</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Respons ter-scope ke tenant pemilik key. Batas laju 120 permintaan/menit per key.
            </p>
          </CardContent>
        </Card>
      </div>
    </Can>
  );
}

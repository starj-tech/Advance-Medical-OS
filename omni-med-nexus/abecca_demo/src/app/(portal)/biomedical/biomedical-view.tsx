"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Wrench } from "lucide-react";
import type { BiomedicalAsset, AssetSummary } from "@/server/biomedical/assets";
import {
  ASSET_CATEGORIES, ASSET_CATEGORY_LABEL,
  ASSET_STATUSES, ASSET_STATUS_LABEL, ASSET_STATUS_VARIANT,
  CALIBRATION_LABEL, CALIBRATION_VARIANT,
  calibrationState, daysUntilDue,
  type AssetCategory, type AssetStatus,
} from "@/lib/biomedical";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY = {
  name: "", category: "monitoring" as AssetCategory, location: "", serialNo: "",
  status: "operational" as AssetStatus, lastMaintenance: "", nextDue: "", notes: "",
};

export function BiomedicalView() {
  const [assets, setAssets] = useState<BiomedicalAsset[]>([]);
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const now = new Date();

  const load = useCallback(async () => {
    const res = await fetch("/api/assets");
    if (res.ok) {
      const j = await res.json();
      setAssets(j.assets);
      setSummary(j.summary);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const complete = draft.name.trim().length > 0 && draft.location.trim().length > 0;

  const add = async () => {
    if (!complete) return;
    setBusy(true);
    const res = await fetch("/api/assets", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: draft.name, category: draft.category, location: draft.location,
        serialNo: draft.serialNo.trim() || null, status: draft.status,
        lastMaintenance: draft.lastMaintenance || null, nextDue: draft.nextDue || null,
        notes: draft.notes.trim() || null,
      }),
    });
    setBusy(false);
    if (res.ok) { setDraft(EMPTY); await load(); }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/assets/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) await load();
  };

  return (
    <Can permission="device:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke aset biomedik.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Aset Biomedik & Kalibrasi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registri alat medis (IPSRS) dengan jadwal kalibrasi/pemeliharaan — pendukung akreditasi KARS/MFK.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total aset</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{summary?.total ?? "—"}</p>
          </Card>
          <Card className="p-4">
            <Badge variant="success">Operasional</Badge>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.byStatus.operational ?? "—"}</p>
          </Card>
          <Card className="p-4">
            <Badge variant="warning">Segera kalibrasi</Badge>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.calibration.due_soon ?? "—"}</p>
            <p className="text-[11px] text-muted-foreground">≤30 hari</p>
          </Card>
          <Card className="p-4">
            <Badge variant="danger">Lewat jatuh tempo</Badge>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.calibration.overdue ?? "—"}</p>
          </Card>
        </section>

        <Can permission="device:write">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-4 text-primary" /> Tambah Aset
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <input className={inputCls} value={draft.name} placeholder="Nama alat (mis. Ventilator) *"
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} aria-label="Nama alat" />
              <select className={inputCls} value={draft.category} aria-label="Kategori"
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as AssetCategory }))}>
                {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{ASSET_CATEGORY_LABEL[c]}</option>)}
              </select>
              <input className={inputCls} value={draft.location} placeholder="Lokasi / unit *"
                onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} aria-label="Lokasi" />
              <input className={inputCls} value={draft.serialNo} placeholder="No. seri (opsional)"
                onChange={(e) => setDraft((d) => ({ ...d, serialNo: e.target.value }))} aria-label="No. seri" />
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Status</span>
                <select className={inputCls} value={draft.status} aria-label="Status"
                  onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as AssetStatus }))}>
                  {ASSET_STATUSES.map((s) => <option key={s} value={s}>{ASSET_STATUS_LABEL[s]}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Kalibrasi berikutnya</span>
                <input type="date" className={inputCls} value={draft.nextDue}
                  onChange={(e) => setDraft((d) => ({ ...d, nextDue: e.target.value }))} aria-label="Kalibrasi berikutnya" />
              </label>
              <div className="flex justify-end sm:col-span-2">
                <Button onClick={add} disabled={busy || !complete}>
                  <Plus className="size-4" /> Simpan aset
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-4 text-primary" /> Registri Aset
            </CardTitle>
            <Badge variant="muted">{assets.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {assets.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada aset terdaftar.</p>
            ) : (
              <ul className="divide-y divide-border">
                {assets.map((a) => {
                  const cal = calibrationState(a.nextDue, now);
                  const days = daysUntilDue(a.nextDue, now);
                  return (
                    <li key={a.id} className="flex flex-col gap-2 px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={ASSET_STATUS_VARIANT[a.status]}>{ASSET_STATUS_LABEL[a.status]}</Badge>
                        <span className="text-sm font-medium">{a.name}</span>
                        <Badge variant="muted">{ASSET_CATEGORY_LABEL[a.category]}</Badge>
                        {cal && <Badge variant={CALIBRATION_VARIANT[cal]}>{CALIBRATION_LABEL[cal]}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {a.location}
                        {a.serialNo ? ` · SN ${a.serialNo}` : ""}
                        {a.nextDue ? ` · Kalibrasi ${a.nextDue}${days != null && days >= 0 ? ` (${days} hari lagi)` : days != null ? " (lewat)" : ""}` : " · tanpa jadwal kalibrasi"}
                      </p>
                      <Can permission="device:write">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            Status
                            <select className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                              value={a.status} aria-label={`Status ${a.name}`}
                              onChange={(e) => patch(a.id, { status: e.target.value as AssetStatus })}>
                              {ASSET_STATUSES.map((s) => <option key={s} value={s}>{ASSET_STATUS_LABEL[s]}</option>)}
                            </select>
                          </label>
                          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            Kalibrasi
                            <input type="date" className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                              defaultValue={a.nextDue ?? ""} aria-label={`Kalibrasi ${a.name}`}
                              onChange={(e) => patch(a.id, { nextDue: e.target.value || null })} />
                          </label>
                        </div>
                      </Can>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </Can>
  );
}

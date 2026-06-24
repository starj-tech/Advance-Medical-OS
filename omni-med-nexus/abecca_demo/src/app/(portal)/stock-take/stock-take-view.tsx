"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, Plus } from "lucide-react";
import type { StockTakeRecord, StockTakeSummary } from "@/server/pharmacy/stock-take";
import {
  variance, varianceStatus, VARIANCE_STATUS_LABEL, VARIANCE_STATUS_VARIANT,
} from "@/lib/stock-take";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

type BatchOpt = { batchId: string; itemName: string; unit: string; batchNo: string; systemQty: number };

export function StockTakeView() {
  const [takes, setTakes] = useState<StockTakeRecord[]>([]);
  const [summary, setSummary] = useState<StockTakeSummary | null>(null);
  const [batchOpts, setBatchOpts] = useState<BatchOpt[]>([]);
  const [itemNames, setItemNames] = useState<Record<string, string>>({});
  const [batchId, setBatchId] = useState("");
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [sRes, iRes] = await Promise.all([
      fetch("/api/pharmacy/stock-take"),
      fetch("/api/pharmacy/inventory"),
    ]);
    if (sRes.ok) {
      const j = await sRes.json();
      setTakes(j.takes);
      setSummary(j.summary);
    }
    if (iRes.ok) {
      const report = await iRes.json();
      const opts: BatchOpt[] = [];
      const names: Record<string, string> = {};
      for (const r of report.items as { item: { id: string; name: string; unit: string }; batches: { id: string; batchNo: string; quantity: number }[] }[]) {
        names[r.item.id] = r.item.name;
        for (const b of r.batches) {
          opts.push({ batchId: b.id, itemName: r.item.name, unit: r.item.unit, batchNo: b.batchNo, systemQty: b.quantity });
        }
      }
      setBatchOpts(opts);
      setItemNames(names);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const selected = batchOpts.find((b) => b.batchId === batchId);
  const previewVariance = useMemo(() => {
    if (!selected || counted === "") return null;
    return variance(selected.systemQty, Number(counted));
  }, [selected, counted]);

  const add = async () => {
    if (!batchId || counted === "") return;
    setBusy(true);
    const res = await fetch("/api/pharmacy/stock-take", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ batchId, countedQty: Number(counted), note: note.trim() || null }),
    });
    setBusy(false);
    if (res.ok) { setBatchId(""); setCounted(""); setNote(""); await load(); }
  };

  const apply = async (id: string) => {
    if ((await fetch(`/api/pharmacy/stock-take/${id}`, { method: "PATCH" })).ok) await load();
  };

  return (
    <Can permission="formulary:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke stok opname.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Stok Opname (Rekonsiliasi Inventory)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hitung fisik vs sistem per batch — selisih tercatat & dapat diterapkan ke stok. Pendukung audit & tata kelola farmasi.
          </p>
        </div>

        <section className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <Badge variant="success">Sesuai</Badge>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.byStatus.match ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Tanpa selisih</p>
          </Card>
          <Card className="p-4">
            <Badge variant="warning">Lebih</Badge>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.byStatus.surplus ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Surplus</p>
          </Card>
          <Card className="p-4">
            <Badge variant="danger">Kurang</Badge>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.byStatus.shortage ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Shortage</p>
          </Card>
        </section>

        <Can permission="formulary:dispense">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="size-4 text-primary" /> Catat Hitung Fisik</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {batchOpts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada batch inventory. Tambahkan/terima batch di menu Inventory dulu.</p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <select className={`${inputCls} lg:col-span-2`} value={batchId} aria-label="Batch"
                      onChange={(e) => setBatchId(e.target.value)}>
                      <option value="">Pilih batch…</option>
                      {batchOpts.map((b) => (
                        <option key={b.batchId} value={b.batchId}>{b.itemName} · {b.batchNo} (sistem {b.systemQty} {b.unit})</option>
                      ))}
                    </select>
                    <input className={inputCls} type="number" min={0} value={counted} placeholder="Jumlah hasil hitung *"
                      onChange={(e) => setCounted(e.target.value)} aria-label="Jumlah hasil hitung" />
                  </div>
                  <input className={inputCls} value={note} placeholder="Catatan (mis. rusak, hilang)"
                    onChange={(e) => setNote(e.target.value)} aria-label="Catatan" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {selected ? `Sistem ${selected.systemQty} ${selected.unit}` : "—"}
                      {previewVariance != null && (
                        <> · selisih <Badge variant={VARIANCE_STATUS_VARIANT[varianceStatus(previewVariance)]}>
                          {previewVariance > 0 ? `+${previewVariance}` : previewVariance} · {VARIANCE_STATUS_LABEL[varianceStatus(previewVariance)]}
                        </Badge></>
                      )}
                    </span>
                    <Button onClick={add} disabled={busy || !batchId || counted === ""}>
                      <Plus className="size-4" /> Simpan opname
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardCheck className="size-4 text-primary" /> Riwayat Opname</CardTitle>
            <Badge variant="muted">{takes.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {takes.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada opname tercatat.</p>
            ) : (
              <ul className="divide-y divide-border">
                {takes.map((t) => {
                  const status = varianceStatus(t.variance);
                  return (
                    <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{itemNames[t.itemId] ?? t.itemId}</span>
                          <Badge variant="muted">{t.batchNo}</Badge>
                          <Badge variant={VARIANCE_STATUS_VARIANT[status]}>
                            {t.variance > 0 ? `+${t.variance}` : t.variance} · {VARIANCE_STATUS_LABEL[status]}
                          </Badge>
                          {t.applied && <Badge variant="info">diterapkan</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          sistem {t.systemQty} → hitung {t.countedQty} · {formatDate(t.createdAt)}
                          {t.note ? ` · ${t.note}` : ""}
                        </p>
                      </div>
                      {!t.applied && (
                        <Can permission="formulary:dispense">
                          <Button size="sm" variant="secondary" onClick={() => apply(t.id)}>
                            <Check className="size-4" /> Terapkan
                          </Button>
                        </Can>
                      )}
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

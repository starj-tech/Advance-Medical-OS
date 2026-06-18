"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Boxes, CalendarClock, PackagePlus, PackageX, Plus } from "lucide-react";
import type { InventoryReport } from "@/server/pharmacy/inventory";
import {
  EXPIRY_LABEL, EXPIRY_VARIANT,
  STOCK_STATUS_LABEL, STOCK_STATUS_VARIANT,
} from "@/lib/inventory";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY_ITEM = { name: "", unit: "", reorderPoint: "" };
const EMPTY_BATCH = { itemId: "", batchNo: "", quantity: "", expiryDate: "" };

export function InventoryView() {
  const [report, setReport] = useState<InventoryReport | null>(null);
  const [item, setItem] = useState(EMPTY_ITEM);
  const [batch, setBatch] = useState(EMPTY_BATCH);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/pharmacy/inventory");
    if (res.ok) setReport(await res.json());
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const itemComplete = item.name.trim() && item.unit.trim() && item.reorderPoint !== "";
  const batchComplete = batch.itemId && batch.batchNo.trim() && batch.quantity !== "" && batch.expiryDate;

  const addItem = async () => {
    if (!itemComplete) return;
    setBusy(true);
    const res = await fetch("/api/pharmacy/inventory", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: item.name, unit: item.unit, reorderPoint: Number(item.reorderPoint) }),
    });
    setBusy(false);
    if (res.ok) { setItem(EMPTY_ITEM); await load(); }
  };

  const receiveBatch = async () => {
    if (!batchComplete) return;
    setBusy(true);
    const res = await fetch(`/api/pharmacy/inventory/${batch.itemId}/batches`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        batchNo: batch.batchNo, quantity: Number(batch.quantity), expiryDate: batch.expiryDate,
      }),
    });
    setBusy(false);
    if (res.ok) { setBatch((b) => ({ ...EMPTY_BATCH, itemId: b.itemId })); await load(); }
  };

  const saveQuantity = async (batchId: string) => {
    const raw = edits[batchId];
    if (raw === undefined || raw === "") return;
    const res = await fetch(`/api/pharmacy/inventory/batches/${batchId}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantity: Number(raw) }),
    });
    if (res.ok) {
      setEdits((e) => { const next = { ...e }; delete next[batchId]; return next; });
      await load();
    }
  };

  const alerts = report?.alerts;
  const items = report?.items ?? [];

  return (
    <Can permission="formulary:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke inventory farmasi.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inventory Farmasi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stok per item dari akumulasi batch — status pemesanan ulang & pelacakan kedaluwarsa otomatis.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{alerts?.lowStock ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Stok rendah</p>
          </Card>
          <Card className="p-4">
            <PackageX className="size-4 text-rose-600 dark:text-rose-400" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{alerts?.outOfStock ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Habis</p>
          </Card>
          <Card className="p-4">
            <CalendarClock className="size-4 text-amber-600 dark:text-amber-400" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{alerts?.expiringSoonBatches ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Batch segera kedaluwarsa</p>
          </Card>
          <Card className="p-4">
            <CalendarClock className="size-4 text-rose-600 dark:text-rose-400" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{alerts?.expiredBatches ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Batch kedaluwarsa</p>
          </Card>
        </section>

        <Can permission="formulary:dispense">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="size-4 text-primary" /> Tambah Item
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <input className={inputCls} value={item.name} placeholder="Nama item (mis. Paracetamol 500 mg) *"
                  onChange={(e) => setItem((d) => ({ ...d, name: e.target.value }))} aria-label="Nama item" />
                <div className="grid grid-cols-2 gap-3">
                  <input className={inputCls} value={item.unit} placeholder="Satuan (mis. tablet) *"
                    onChange={(e) => setItem((d) => ({ ...d, unit: e.target.value }))} aria-label="Satuan" />
                  <input className={inputCls} type="number" min={0} value={item.reorderPoint} placeholder="Titik reorder *"
                    onChange={(e) => setItem((d) => ({ ...d, reorderPoint: e.target.value }))} aria-label="Titik pemesanan ulang" />
                </div>
                <Button onClick={addItem} disabled={busy || !itemComplete}>
                  <Plus className="size-4" /> Simpan item
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PackagePlus className="size-4 text-primary" /> Terima Batch
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <select className={inputCls} value={batch.itemId}
                  onChange={(e) => setBatch((b) => ({ ...b, itemId: e.target.value }))} aria-label="Item">
                  <option value="">Pilih item…</option>
                  {items.map(({ item: it }) => <option key={it.id} value={it.id}>{it.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input className={inputCls} value={batch.batchNo} placeholder="No. batch *"
                    onChange={(e) => setBatch((b) => ({ ...b, batchNo: e.target.value }))} aria-label="Nomor batch" />
                  <input className={inputCls} type="number" min={0} value={batch.quantity} placeholder="Jumlah *"
                    onChange={(e) => setBatch((b) => ({ ...b, quantity: e.target.value }))} aria-label="Jumlah" />
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Kedaluwarsa *</span>
                  <input className={inputCls} type="date" value={batch.expiryDate}
                    onChange={(e) => setBatch((b) => ({ ...b, expiryDate: e.target.value }))} aria-label="Tanggal kedaluwarsa" />
                </label>
                <Button onClick={receiveBatch} disabled={busy || !batchComplete}>
                  <PackagePlus className="size-4" /> Terima batch
                </Button>
              </CardContent>
            </Card>
          </div>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="size-4 text-primary" /> Daftar Stok
            </CardTitle>
            <Badge variant="muted">{items.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {items.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada item terdaftar.</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map(({ item: it, totalStock, status, batches }) => (
                  <li key={it.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{it.name}</span>
                      <Badge variant={STOCK_STATUS_VARIANT[status]}>{STOCK_STATUS_LABEL[status]}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {totalStock} {it.unit} · reorder ≤ {it.reorderPoint}
                      </span>
                    </div>
                    {batches.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {batches.map((b) => (
                          <li key={b.id} className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono text-muted-foreground">{b.batchNo}</span>
                            <Badge variant={EXPIRY_VARIANT[b.bucket]}>{EXPIRY_LABEL[b.bucket]}</Badge>
                            <span className="text-muted-foreground">ED {formatDate(b.expiryDate)}</span>
                            <span className="text-muted-foreground">· {b.quantity} {it.unit}</span>
                            <Can permission="formulary:dispense">
                              <span className="ml-auto flex items-center gap-1.5">
                                <input
                                  className="h-7 w-20 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
                                  type="number" min={0}
                                  value={edits[b.id] ?? String(b.quantity)}
                                  onChange={(e) => setEdits((m) => ({ ...m, [b.id]: e.target.value }))}
                                  aria-label={`Sesuaikan jumlah batch ${b.batchNo}`}
                                />
                                <Button size="sm" variant="ghost" onClick={() => saveQuantity(b.id)}
                                  disabled={edits[b.id] === undefined || edits[b.id] === String(b.quantity)}>
                                  Simpan
                                </Button>
                              </span>
                            </Can>
                          </li>
                        ))}
                      </ul>
                    )}
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

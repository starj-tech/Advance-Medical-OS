"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Plus, Warehouse } from "lucide-react";
import type { InventoryReport } from "@/server/pharmacy/inventory";
import type { StockTransfer } from "@/server/pharmacy/stock-transfer";
import { locationLabel, stockByLocation } from "@/lib/stock-transfer";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

export function StockTransferView() {
  const [report, setReport] = useState<InventoryReport | null>(null);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [fromBatchId, setFromBatchId] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [quantity, setQuantity] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [inv, tr] = await Promise.all([
      fetch("/api/pharmacy/inventory"),
      fetch("/api/pharmacy/stock-transfer"),
    ]);
    if (inv.ok) setReport(await inv.json());
    if (tr.ok) setTransfers((await tr.json()).transfers);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Flatten in-stock batches across items into selectable transfer sources.
  const sources = useMemo(() => {
    const out: { id: string; label: string; itemId: string; location: string | null; quantity: number; unit: string }[] = [];
    for (const it of report?.items ?? []) {
      for (const b of it.batches) {
        if (b.quantity > 0) {
          out.push({
            id: b.id, itemId: it.item.id, location: b.location, quantity: b.quantity, unit: it.item.unit,
            label: `${it.item.name} · ${b.batchNo} · ${locationLabel(b.location)} (${b.quantity} ${it.item.unit})`,
          });
        }
      }
    }
    return out;
  }, [report]);

  const selected = sources.find((s) => s.id === fromBatchId);
  // Per-depot distribution of the selected source's item (same unit → meaningful sum).
  const distribution = useMemo(() => {
    if (!selected) return null;
    const item = report?.items.find((i) => i.item.id === selected.itemId);
    return item ? stockByLocation(item.batches) : null;
  }, [selected, report]);

  const transfer = async () => {
    if (!fromBatchId || !toLocation.trim() || !quantity) return;
    setBusy(true);
    setErr("");
    const res = await fetch("/api/pharmacy/stock-transfer", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ fromBatchId, toLocation: toLocation.trim(), quantity: Number(quantity) }),
    });
    setBusy(false);
    if (res.ok) { setFromBatchId(""); setToLocation(""); setQuantity(""); await load(); }
    else { const j = await res.json().catch(() => ({})); setErr(j.error ?? "Transfer gagal"); }
  };

  return (
    <Can permission="formulary:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke transfer stok.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Transfer Stok Antar-Depo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Distribusi stok obat/alkes antar lokasi/depo — stok kekal (sumber berkurang, batch baru di tujuan).
          </p>
        </div>

        <Can permission="formulary:dispense">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="size-4 text-primary" /> Transfer Stok
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[11px] text-muted-foreground">Batch sumber</span>
                <select className={inputCls} value={fromBatchId} aria-label="Batch sumber"
                  onChange={(e) => setFromBatchId(e.target.value)}>
                  <option value="">— pilih batch —</option>
                  {sources.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <input className={inputCls} value={toLocation} placeholder="Depo tujuan (mis. Depo IGD) *"
                onChange={(e) => setToLocation(e.target.value)} aria-label="Depo tujuan" />
              <input type="number" min={1} max={selected?.quantity} className={inputCls} value={quantity}
                placeholder={selected ? `Jumlah (maks ${selected.quantity})` : "Jumlah"}
                onChange={(e) => setQuantity(e.target.value)} aria-label="Jumlah" />
              {distribution && (
                <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                  <span className="text-[11px] text-muted-foreground">Distribusi saat ini:</span>
                  {Object.entries(distribution).map(([loc, qty]) => (
                    <Badge key={loc} variant="muted">{loc}: {qty} {selected?.unit}</Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between sm:col-span-2">
                <span className="text-xs text-danger">{err}</span>
                <Button onClick={transfer} disabled={busy || !fromBatchId || !toLocation.trim() || !quantity}>
                  <Plus className="size-4" /> Transfer
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="size-4 text-primary" /> Riwayat Transfer
            </CardTitle>
            <Badge variant="muted">{transfers.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {transfers.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada transfer.</p>
            ) : (
              <ul className="divide-y divide-border">
                {transfers.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
                    <Badge variant="info">{t.quantity}×</Badge>
                    <span className="text-sm font-medium">{t.itemName}</span>
                    <span className="text-xs text-muted-foreground">· {t.batchNo}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {t.fromLocation} <ArrowRightLeft className="size-3" /> {t.toLocation}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatDate(t.createdAt)}</span>
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

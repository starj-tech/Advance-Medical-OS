"use client";

import { useCallback, useEffect, useState } from "react";
import { PackageCheck, Pill, Plus, TriangleAlert } from "lucide-react";
import type { PharmacyWorklist } from "@/server/pharmacy/worklist";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

export function PharmacyView() {
  const [data, setData] = useState<PharmacyWorklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [restockQty, setRestockQty] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/pharmacy/dispenses");
    setData(res.ok ? await res.json() : null);
    setLoading(false);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const dispense = async (orderId: string) => {
    const raw = qty[orderId];
    const quantity = raw && Number.isFinite(Number(raw)) ? Math.max(1, Math.floor(Number(raw))) : 1;
    setBusy(orderId);
    const res = await fetch("/api/pharmacy/dispenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, quantity }),
    });
    setBusy(null);
    if (res.ok) {
      setQty((q) => ({ ...q, [orderId]: "" }));
      await load();
    }
  };

  const restock = async (formularyId: number) => {
    const raw = restockQty[formularyId];
    const quantity = raw && Number.isFinite(Number(raw)) ? Math.max(1, Math.floor(Number(raw))) : 0;
    if (quantity <= 0) return;
    setBusy(`stock-${formularyId}`);
    const res = await fetch("/api/pharmacy/stock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formularyId, quantity }),
    });
    setBusy(null);
    if (res.ok) {
      setRestockQty((q) => ({ ...q, [formularyId]: "" }));
      await load();
    }
  };

  if (loading) {
    return <p className="py-20 text-center text-sm text-muted-foreground">Memuat…</p>;
  }
  if (!data) {
    return (
      <p className="py-20 text-center text-sm text-muted-foreground">
        Worklist farmasi tidak tersedia.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dispensing Farmasi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Antrean verifikasi & penyiapan obat dari resep CPOE — menutup loop resep → dispensing → pemberian.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="size-4 text-primary" /> Antrean Penyiapan
          </CardTitle>
          <Badge variant={data.pending.length ? "warning" : "success"}>
            {data.pending.length} menunggu
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {data.pending.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">
              Tidak ada resep yang menunggu penyiapan.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.pending.map((p) => (
                <li key={p.orderId} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{p.drugName}</span>
                      {p.dose && <span className="text-xs text-muted-foreground">{p.dose}</span>}
                      {p.lowStock && (
                        <Badge variant="danger">
                          <TriangleAlert className="size-3" /> Stok rendah
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Pasien {p.patientId}
                      {p.route ? ` · ${p.route}` : ""}
                      {p.frequency ? ` · ${p.frequency}` : ""}
                      {p.stockQuantity != null ? ` · stok ${p.stockQuantity}` : " · non-formularium"}
                    </p>
                  </div>
                  <Can permission="formulary:dispense">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={qty[p.orderId] ?? ""}
                        onChange={(e) => setQty((q) => ({ ...q, [p.orderId]: e.target.value }))}
                        placeholder="Qty"
                        aria-label="Kuantitas"
                        className="h-9 w-16 rounded-lg border border-border bg-background px-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
                      />
                      <Button size="sm" onClick={() => dispense(p.orderId)} disabled={busy === p.orderId}>
                        <PackageCheck className="size-4" /> Dispense
                      </Button>
                    </div>
                  </Can>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-primary" /> Stok Menipis — Reorder
          </CardTitle>
          <Badge variant={data.lowStock.length ? "danger" : "success"}>{data.lowStock.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {data.lowStock.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">
              Semua stok di atas titik pesan ulang.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.lowStock.map((m) => (
                <li key={m.formularyId} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">{m.medicationName}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{m.dosage}</span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Stok {m.stockQuantity} · titik pesan ulang {m.reorderLevel}
                    </p>
                  </div>
                  <Can permission="formulary:dispense">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={restockQty[m.formularyId] ?? ""}
                        onChange={(e) => setRestockQty((q) => ({ ...q, [m.formularyId]: e.target.value }))}
                        placeholder="Qty"
                        aria-label="Jumlah restock"
                        className="h-9 w-16 rounded-lg border border-border bg-background px-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restock(m.formularyId)}
                        disabled={busy === `stock-${m.formularyId}`}
                      >
                        <Plus className="size-4" /> Tambah Stok
                      </Button>
                    </div>
                  </Can>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="size-4 text-primary" /> Dispensing Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recent.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">
              Belum ada dispensing.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recent.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <Badge variant="success">{d.quantity}×</Badge>
                  <span className="min-w-0 flex-1 font-medium">{d.drugName}</span>
                  <span className="text-xs text-muted-foreground">Pasien {d.patientId}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(d.dispensedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

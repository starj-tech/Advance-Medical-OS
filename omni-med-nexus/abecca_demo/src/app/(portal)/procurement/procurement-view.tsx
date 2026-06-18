"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, ClipboardList, Plus, Send, ShoppingCart, Trash2, Truck } from "lucide-react";
import type { PurchaseOrderView } from "@/server/pharmacy/procurement";
import {
  PO_STATUS_LABEL, PO_STATUS_VARIANT,
  FULFILLMENT_LABEL, FULFILLMENT_VARIANT,
  lineTotal, poTotal,
} from "@/lib/procurement";
import { formatIDR, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

type ItemOpt = { id: string; name: string; unit: string };
type DraftLine = { itemId: string; quantity: string; unitPrice: string };
type ReceiveDraft = { batchNo: string; quantity: string; expiryDate: string };

const EMPTY_LINE: DraftLine = { itemId: "", quantity: "", unitPrice: "" };

export function ProcurementView() {
  const [orders, setOrders] = useState<PurchaseOrderView[]>([]);
  const [items, setItems] = useState<ItemOpt[]>([]);
  const [selected, setSelected] = useState<PurchaseOrderView | null>(null);
  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ ...EMPTY_LINE }]);
  const [receive, setReceive] = useState<Record<string, ReceiveDraft>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [oRes, iRes] = await Promise.all([
      fetch("/api/pharmacy/procurement"),
      fetch("/api/pharmacy/inventory"),
    ]);
    if (oRes.ok) setOrders((await oRes.json()).orders);
    if (iRes.ok) {
      const report = await iRes.json();
      setItems(report.items.map((r: { item: ItemOpt }) => r.item));
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const openDetail = async (poId: string) => {
    if (selected?.id === poId) { setSelected(null); return; }
    const res = await fetch(`/api/pharmacy/procurement/${poId}`);
    if (res.ok) setSelected(await res.json());
  };

  const refreshSelected = async (poId: string) => {
    const res = await fetch(`/api/pharmacy/procurement/${poId}`);
    if (res.ok) setSelected(await res.json());
  };

  const draftLines = lines
    .map((l) => ({ quantity: Number(l.quantity) || 0, unitPrice: Number(l.unitPrice) || 0 }));
  const draftTotal = poTotal(draftLines);
  const canSubmit =
    supplier.trim() && lines.some((l) => l.itemId && Number(l.quantity) > 0);

  const createPo = async () => {
    if (!canSubmit) return;
    setBusy(true);
    const payload = {
      supplier: supplier.trim(),
      note: note.trim() || null,
      lines: lines
        .filter((l) => l.itemId && Number(l.quantity) > 0)
        .map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) || 0 })),
    };
    const res = await fetch("/api/pharmacy/procurement", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    setBusy(false);
    if (res.ok) {
      setSupplier(""); setNote(""); setLines([{ ...EMPTY_LINE }]);
      await load();
    }
  };

  const changeStatus = async (poId: string, status: "sent" | "cancelled") => {
    const res = await fetch(`/api/pharmacy/procurement/${poId}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }),
    });
    if (res.ok) { await load(); await refreshSelected(poId); }
  };

  const submitReceive = async (poId: string, lineId: string) => {
    const d = receive[lineId];
    if (!d || !d.batchNo.trim() || !d.expiryDate || Number(d.quantity) <= 0) return;
    const res = await fetch(`/api/pharmacy/procurement/${poId}/receipts`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ lineId, batchNo: d.batchNo.trim(), quantity: Number(d.quantity), expiryDate: d.expiryDate }),
    });
    if (res.ok) {
      setReceive((m) => { const next = { ...m }; delete next[lineId]; return next; });
      await load(); await refreshSelected(poId);
    }
  };

  const pending = orders.filter((o) => o.status !== "cancelled" && o.fulfillment !== "complete").length;
  const outstandingValue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.lines.reduce((s, l) => s + lineTotal(l.outstanding, l.unitPrice), 0), 0);

  return (
    <Can permission="procurement:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke pengadaan farmasi.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pengadaan Farmasi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Purchase order → penerimaan barang. Setiap penerimaan otomatis membukukan batch ke inventory.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <ShoppingCart className="size-4 text-primary" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{orders.length}</p>
            <p className="text-xs text-muted-foreground">Total PO</p>
          </Card>
          <Card className="p-4">
            <Truck className="size-4 text-amber-600 dark:text-amber-400" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{pending}</p>
            <p className="text-xs text-muted-foreground">PO belum lengkap</p>
          </Card>
          <Card className="col-span-2 p-4 sm:col-span-1">
            <ClipboardList className="size-4 text-primary" />
            <p className="mt-3 text-lg font-semibold tabular-nums">{formatIDR(outstandingValue)}</p>
            <p className="text-xs text-muted-foreground">Nilai belum diterima</p>
          </Card>
        </section>

        <Can permission="procurement:manage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-4 text-primary" /> Buat Purchase Order
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada item inventory. Tambahkan item di menu Inventory dulu.
                </p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className={inputCls} value={supplier} placeholder="Pemasok / distributor *"
                      onChange={(e) => setSupplier(e.target.value)} aria-label="Pemasok" />
                    <input className={inputCls} value={note} placeholder="Catatan (opsional)"
                      onChange={(e) => setNote(e.target.value)} aria-label="Catatan" />
                  </div>
                  <div className="flex flex-col gap-2">
                    {lines.map((l, i) => (
                      <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_5rem_8rem_auto] sm:items-center">
                        <select className={inputCls} value={l.itemId} aria-label="Item"
                          onChange={(e) => setLines((ls) => ls.map((x, j) => j === i ? { ...x, itemId: e.target.value } : x))}>
                          <option value="">Pilih item…</option>
                          {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                        </select>
                        <input className={inputCls} type="number" min={1} value={l.quantity} placeholder="Qty" aria-label="Jumlah"
                          onChange={(e) => setLines((ls) => ls.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} />
                        <input className={inputCls} type="number" min={0} value={l.unitPrice} placeholder="Harga satuan" aria-label="Harga satuan"
                          onChange={(e) => setLines((ls) => ls.map((x, j) => j === i ? { ...x, unitPrice: e.target.value } : x))} />
                        <Button size="sm" variant="ghost" aria-label="Hapus baris"
                          onClick={() => setLines((ls) => ls.length > 1 ? ls.filter((_, j) => j !== i) : ls)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, { ...EMPTY_LINE }])}>
                      <Plus className="size-4" /> Tambah baris
                    </Button>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm text-muted-foreground">Total order</span>
                    <span className="text-sm font-semibold tabular-nums">{formatIDR(draftTotal)}</span>
                  </div>
                  <Button onClick={createPo} disabled={busy || !canSubmit}>
                    <Plus className="size-4" /> Simpan PO (draf)
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="size-4 text-primary" /> Daftar Purchase Order
            </CardTitle>
            <Badge variant="muted">{orders.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {orders.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada purchase order.</p>
            ) : (
              <ul className="divide-y divide-border">
                {orders.map((po) => {
                  const open = selected?.id === po.id;
                  const detail = open ? selected : po;
                  return (
                    <li key={po.id} className="px-5 py-3">
                      <button type="button" onClick={() => openDetail(po.id)} className="flex w-full flex-wrap items-center gap-2 text-left">
                        <span className="text-sm font-medium">{po.supplier}</span>
                        <Badge variant={PO_STATUS_VARIANT[po.status]}>{PO_STATUS_LABEL[po.status]}</Badge>
                        <Badge variant={FULFILLMENT_VARIANT[po.fulfillment]}>{FULFILLMENT_LABEL[po.fulfillment]}</Badge>
                        <span className="ml-auto text-sm font-semibold tabular-nums">{formatIDR(po.total)}</span>
                      </button>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {po.lines.length} baris · {formatDate(po.createdAt)}
                      </p>

                      {open && (
                        <div className="mt-3 flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
                          <Can permission="procurement:manage">
                            {detail.status === "draft" && (
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="secondary" onClick={() => changeStatus(po.id, "sent")}>
                                  <Send className="size-4" /> Tandai dikirim
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => changeStatus(po.id, "cancelled")}>
                                  <Ban className="size-4" /> Batalkan
                                </Button>
                              </div>
                            )}
                          </Can>

                          <ul className="flex flex-col gap-2">
                            {detail.lines.map((l) => (
                              <li key={l.id} className="rounded-md border border-border bg-background p-2.5">
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                  <span className="font-medium">{l.itemName}</span>
                                  <Badge variant={FULFILLMENT_VARIANT[l.fulfillment]}>{FULFILLMENT_LABEL[l.fulfillment]}</Badge>
                                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                                    {l.receivedQty}/{l.quantity} diterima · sisa {l.outstanding} · {formatIDR(lineTotal(l.quantity, l.unitPrice))}
                                  </span>
                                </div>
                                {detail.status !== "cancelled" && l.outstanding > 0 && (
                                  <Can permission="procurement:manage">
                                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_5rem_auto_auto] sm:items-center">
                                      <input className={inputCls} placeholder="No. batch" aria-label="Nomor batch"
                                        value={receive[l.id]?.batchNo ?? ""}
                                        onChange={(e) => setReceive((m) => ({ ...m, [l.id]: { ...(m[l.id] ?? { batchNo: "", quantity: "", expiryDate: "" }), batchNo: e.target.value } }))} />
                                      <input className={inputCls} type="number" min={1} max={l.outstanding} placeholder="Qty" aria-label="Jumlah terima"
                                        value={receive[l.id]?.quantity ?? ""}
                                        onChange={(e) => setReceive((m) => ({ ...m, [l.id]: { ...(m[l.id] ?? { batchNo: "", quantity: "", expiryDate: "" }), quantity: e.target.value } }))} />
                                      <input className={inputCls} type="date" aria-label="Tanggal kedaluwarsa"
                                        value={receive[l.id]?.expiryDate ?? ""}
                                        onChange={(e) => setReceive((m) => ({ ...m, [l.id]: { ...(m[l.id] ?? { batchNo: "", quantity: "", expiryDate: "" }), expiryDate: e.target.value } }))} />
                                      <Button size="sm" onClick={() => submitReceive(po.id, l.id)}>
                                        <Truck className="size-4" /> Terima
                                      </Button>
                                    </div>
                                  </Can>
                                )}
                              </li>
                            ))}
                          </ul>

                          {detail.receipts && detail.receipts.length > 0 && (
                            <div>
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Riwayat penerimaan</p>
                              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                                {detail.receipts.map((r) => (
                                  <li key={r.id} className="flex flex-wrap items-center gap-2">
                                    <Truck className="size-3.5" />
                                    <span className="font-mono">{r.batchNo}</span>
                                    <span>· {r.quantity} unit · ED {formatDate(r.expiryDate)} · {formatDate(r.createdAt)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
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

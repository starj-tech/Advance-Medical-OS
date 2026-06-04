"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Receipt, Wallet } from "lucide-react";
import type { Tariff } from "@/lib/types";
import type { BillSummary, PaymentMethod } from "@/server/billing/charges";
import { formatIDR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
  card: "Kartu",
  insurance: "Asuransi",
};
const METHODS = Object.keys(METHOD_LABEL) as PaymentMethod[];

export function BillingPanel({ encounterId }: { encounterId: string }) {
  const [summary, setSummary] = useState<BillSummary | null>(null);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [tariffId, setTariffId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [payAmount, setPayAmount] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/encounters/${encounterId}/billing`);
    if (res.ok) setSummary(await res.json());
  }, [encounterId]);

  const loadTariffs = useCallback(async () => {
    const res = await fetch("/api/tariffs");
    if (!res.ok) return;
    const data: Tariff[] = await res.json();
    setTariffs(data);
    if (data[0]) setTariffId(data[0].id);
  }, []);

  useEffect(() => {
    // Async loads; state set after await (false positive for the rule).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    void loadTariffs();
  }, [load, loadTariffs]);

  const selectedTariff = tariffs.find((t) => t.id === tariffId);

  const addCharge = async () => {
    if (!selectedTariff) return;
    const res = await fetch(`/api/encounters/${encounterId}/billing`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "charge",
        description: selectedTariff.procedureName,
        category: "tariff",
        unitPrice: selectedTariff.basePrice,
        qty,
      }),
    });
    if (res.ok) {
      setQty(1);
      await load();
    }
  };

  const addPayment = async () => {
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const res = await fetch(`/api/encounters/${encounterId}/billing`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "payment", method, amount }),
    });
    if (res.ok) {
      setPayAmount("");
      await load();
    }
  };

  const balance = summary?.balance ?? 0;

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Receipt className="size-3.5" /> Tagihan Pasien (IDR)
      </span>

      {!summary ? (
        <p className="text-xs text-muted-foreground">Memuat…</p>
      ) : (
        <>
          {summary.charges.length === 0 ? (
            <p className="text-xs text-muted-foreground">Belum ada charge.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {summary.charges.map((c) => (
                <li key={c.id} className="flex items-center gap-3 text-sm">
                  <span className="min-w-0 flex-1">
                    {c.description}
                    {c.qty > 1 && <span className="text-muted-foreground"> ×{c.qty}</span>}
                  </span>
                  <span className="font-mono tabular-nums">{formatIDR(c.amount)}</span>
                </li>
              ))}
            </ul>
          )}

          {summary.payments.length > 0 && (
            <ul className="flex flex-col gap-1 border-t border-border pt-1.5">
              {summary.payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 text-sm text-emerald-700 dark:text-emerald-300">
                  <span className="min-w-0 flex-1">Pembayaran · {METHOD_LABEL[p.method]}</span>
                  <span className="font-mono tabular-nums">−{formatIDR(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-0.5 border-t border-border pt-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total tagihan</span>
              <span className="font-mono tabular-nums">{formatIDR(summary.totalCharges)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Terbayar</span>
              <span className="font-mono tabular-nums">{formatIDR(summary.totalPaid)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Sisa</span>
              <span
                className={`font-mono tabular-nums ${
                  balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {formatIDR(balance)}
              </span>
            </div>
          </div>

          <Can permission="billing:manage">
            <div className="grid gap-2 border-t border-border pt-2 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <select
                  value={tariffId ?? ""}
                  onChange={(e) => setTariffId(Number(e.target.value))}
                  className={`${inputCls} min-w-0 flex-1`}
                  aria-label="Tarif"
                >
                  {tariffs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.procedureName} — {formatIDR(t.basePrice)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  className={`${inputCls} w-16`}
                  aria-label="Qty"
                />
                <Button size="sm" onClick={addCharge} disabled={!selectedTariff}>
                  <Plus className="size-4" /> Charge
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className={inputCls}
                  aria-label="Metode bayar"
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>{METHOD_LABEL[m]}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Jumlah"
                  className={`${inputCls} min-w-0 flex-1`}
                  aria-label="Jumlah bayar"
                />
                <Button size="sm" variant="outline" onClick={addPayment} disabled={!(Number(payAmount) > 0)}>
                  <Wallet className="size-4" /> Bayar
                </Button>
              </div>
            </div>
          </Can>
        </>
      )}
    </div>
  );
}

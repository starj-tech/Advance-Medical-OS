"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Pill, Plus, ShieldCheck } from "lucide-react";
import type { FormularyItem } from "@/lib/types";
import type { MedicationOrder } from "@/server/clinical/medication-orders";
import type { AlertSeverity, SafetyAlert } from "@/lib/drug-safety";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const ROUTES = ["PO", "IV", "IM", "SC", "Inhalasi", "Topikal", "Rektal"];
const FREQS = ["1x1", "2x1", "3x1", "Tiap 6 jam", "Tiap 8 jam", "PRN", "Stat"];

const SEV: Record<AlertSeverity, { box: string; label: string }> = {
  high: { box: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300", label: "Tinggi" },
  moderate: { box: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300", label: "Sedang" },
  info: { box: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300", label: "Info" },
};

export function PrescribePanel({
  encounterId,
  active,
}: {
  encounterId: string;
  active: boolean;
}) {
  const [orders, setOrders] = useState<MedicationOrder[]>([]);
  const [formulary, setFormulary] = useState<FormularyItem[]>([]);
  const [drugId, setDrugId] = useState<number | null>(null);
  const [dose, setDose] = useState("");
  const [route, setRoute] = useState(ROUTES[0]);
  const [freq, setFreq] = useState(FREQS[0]);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [pendingOverride, setPendingOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = formulary.find((f) => f.id === drugId);

  const loadOrders = useCallback(async () => {
    const res = await fetch(`/api/encounters/${encounterId}/medication-orders`);
    if (res.ok) setOrders(await res.json());
  }, [encounterId]);

  const loadFormulary = useCallback(async () => {
    const res = await fetch("/api/formulary");
    if (!res.ok) return;
    const data: FormularyItem[] = await res.json();
    setFormulary(data);
    if (data[0]) {
      setDrugId(data[0].id);
      setDose(data[0].dosage);
    }
  }, []);

  useEffect(() => {
    // Async loads; state set after await (false positive for the rule).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOrders();
    void loadFormulary();
  }, [loadOrders, loadFormulary]);

  const onPickDrug = (id: number) => {
    setDrugId(id);
    const item = formulary.find((f) => f.id === id);
    if (item) setDose(item.dosage);
    setAlerts([]);
    setPendingOverride(false);
    setOverrideReason("");
  };

  const prescribe = async (withOverride: boolean) => {
    if (!selected) return;
    setBusy(true);
    const res = await fetch(`/api/encounters/${encounterId}/medication-orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        drugName: selected.medicationName,
        formularyId: selected.id,
        dose,
        route,
        frequency: freq,
        overrideReason: withOverride ? overrideReason : undefined,
      }),
    });
    if (res.status === 409) {
      const data = await res.json();
      setAlerts(data.alerts ?? []);
      setPendingOverride(true);
      setBusy(false);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setAlerts(data.alerts ?? []);
      setPendingOverride(false);
      setOverrideReason("");
      await loadOrders();
    }
    setBusy(false);
  };

  const stop = async (orderId: string) => {
    const res = await fetch(`/api/encounters/${encounterId}/medication-orders`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, status: "stopped" }),
    });
    if (res.ok) await loadOrders();
  };

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Pill className="size-3.5" /> Resep / CPOE
      </span>

      {orders.length === 0 ? (
        <p className="text-xs text-muted-foreground">Belum ada order obat.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center gap-3 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{o.drugName}</span>{" "}
                <span className="text-muted-foreground">
                  {[o.dose, o.route, o.frequency].filter(Boolean).join(" · ")}
                </span>
                {o.overrideReason && (
                  <span className="ml-1 text-xs text-amber-700 dark:text-amber-300">
                    (override: {o.overrideReason})
                  </span>
                )}
              </span>
              <Badge variant={o.status === "active" ? "success" : "muted"}>{o.status}</Badge>
              <span className="text-[11px] text-muted-foreground">{formatDate(o.createdAt)}</span>
              {active && o.status === "active" && (
                <Can permission="medication:order">
                  <button
                    type="button"
                    onClick={() => stop(o.id)}
                    className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                  >
                    Stop
                  </button>
                </Can>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* CDS alerts from the most recent screening attempt. */}
      {alerts.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {alerts.map((a, i) => (
            <li
              key={i}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${SEV[a.severity].box}`}
            >
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <span className="font-semibold">[{SEV[a.severity].label}]</span> {a.message}
              </span>
            </li>
          ))}
        </ul>
      )}

      {active && (
        <Can permission="medication:order">
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={drugId ?? ""}
              onChange={(e) => onPickDrug(Number(e.target.value))}
              className={inputCls}
              aria-label="Obat"
            >
              {formulary.map((f) => (
                <option key={f.id} value={f.id}>{f.medicationName}</option>
              ))}
            </select>
            <input
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder="Dosis"
              className={inputCls}
              aria-label="Dosis"
            />
            <select value={route} onChange={(e) => setRoute(e.target.value)} className={inputCls} aria-label="Rute">
              {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={freq} onChange={(e) => setFreq(e.target.value)} className={inputCls} aria-label="Frekuensi">
              {FREQS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {pendingOverride ? (
            <div className="space-y-2 rounded-lg border border-rose-500/40 bg-rose-500/5 p-2.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                <AlertTriangle className="size-3.5" /> Peringatan keselamatan tingkat tinggi — wajib alasan untuk melanjutkan.
              </p>
              <input
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Alasan klinis melanjutkan (override)…"
                className={`${inputCls} w-full`}
                aria-label="Alasan override"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => prescribe(true)}
                  disabled={busy || !overrideReason.trim()}
                >
                  Tetap resepkan (override)
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setPendingOverride(false); setAlerts([]); }}>
                  Batal
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" onClick={() => prescribe(false)} disabled={busy || !selected}>
              <Plus className="size-4" /> Resepkan
            </Button>
          )}

          {alerts.length === 0 && !pendingOverride && orders.length > 0 && (
            <p className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" /> Order terakhir lolos skrining keselamatan.
            </p>
          )}
        </Can>
      )}
    </div>
  );
}

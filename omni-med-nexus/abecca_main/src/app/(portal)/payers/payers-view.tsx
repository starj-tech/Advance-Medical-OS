"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, Landmark, Plus } from "lucide-react";
import type { Payer } from "@/server/billing/payers";
import {
  estimateCoverage,
  PAYER_TYPES, PAYER_TYPE_LABEL, CLAIM_SCHEMES, CLAIM_SCHEME_LABEL,
  ELIGIBILITY_LABEL, ELIGIBILITY_VARIANT,
  type PayerType, type ClaimScheme, type EligibilityStatus,
} from "@/lib/payers";
import { CURRENCIES, formatMoney, type Currency } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY = {
  name: "", payerType: "private_insurance" as PayerType, scheme: "fee_for_service" as ClaimScheme,
  currency: "IDR" as Currency, coveragePercent: "80", deductible: "0", copay: "0", ceiling: "",
  eligibilityStatus: "unknown" as EligibilityStatus,
};

export function PayersView() {
  const [payers, setPayers] = useState<Payer[]>([]);
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [estPayerId, setEstPayerId] = useState("");
  const [gross, setGross] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/billing/payers");
    if (res.ok) setPayers((await res.json()).payers);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const complete = draft.name.trim() && draft.coveragePercent !== "";

  const add = async () => {
    if (!complete) return;
    setBusy(true);
    const res = await fetch("/api/billing/payers", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...draft,
        coveragePercent: Number(draft.coveragePercent),
        deductible: Number(draft.deductible) || 0,
        copay: Number(draft.copay) || 0,
        ceiling: draft.ceiling === "" ? null : Number(draft.ceiling),
      }),
    });
    setBusy(false);
    if (res.ok) { setDraft(EMPTY); await load(); }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/billing/payers/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) await load();
  };

  const estPayer = payers.find((p) => p.id === estPayerId);
  const estimate = useMemo(() => {
    if (!estPayer) return null;
    const g = Number(gross);
    if (!Number.isFinite(g) || g <= 0) return null;
    return estimateCoverage(g, {
      coveragePercent: estPayer.coveragePercent, deductible: estPayer.deductible,
      copay: estPayer.copay, ceiling: estPayer.ceiling,
    });
  }, [estPayer, gross]);

  return (
    <Can permission="billing:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke data penjamin.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Penjamin & Estimasi Tanggungan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registri penjamin lintas-negara (multi-mata-uang) + kalkulasi tanggungan penjamin vs pasien — fondasi revenue cycle global.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="size-4 text-primary" /> Estimasi Tanggungan
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <select className={inputCls} value={estPayerId} onChange={(e) => setEstPayerId(e.target.value)} aria-label="Penjamin">
              <option value="">Pilih penjamin…</option>
              {payers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.currency})</option>)}
            </select>
            <input className={inputCls} type="number" min={0} value={gross} placeholder="Total tagihan (gross)"
              onChange={(e) => setGross(e.target.value)} aria-label="Total tagihan" />
            <div className="grid place-items-center rounded-lg border border-border px-3 text-sm">
              {estPayer ? `${estPayer.coveragePercent}% · ${estPayer.currency}` : "—"}
            </div>
            {estimate && estPayer && (
              <div className="sm:col-span-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Gross" value={formatMoney(estimate.gross, { currency: estPayer.currency })} />
                <Stat label="Ditanggung penjamin" value={formatMoney(estimate.covered, { currency: estPayer.currency })} accent="text-emerald-600 dark:text-emerald-400" />
                <Stat label="Tanggungan pasien" value={formatMoney(estimate.patientResponsibility, { currency: estPayer.currency })} accent="text-rose-600 dark:text-rose-400" />
                <Stat label="Deductible + copay" value={formatMoney(estimate.deductible + estimate.copay, { currency: estPayer.currency })} />
              </div>
            )}
          </CardContent>
        </Card>

        <Can permission="billing:manage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="size-4 text-primary" /> Tambah Penjamin</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input className={`${inputCls} sm:col-span-2 lg:col-span-3`} value={draft.name} placeholder="Nama penjamin *"
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} aria-label="Nama penjamin" />
              <select className={inputCls} value={draft.payerType} aria-label="Jenis penjamin"
                onChange={(e) => setDraft((d) => ({ ...d, payerType: e.target.value as PayerType }))}>
                {PAYER_TYPES.map((t) => <option key={t} value={t}>{PAYER_TYPE_LABEL[t]}</option>)}
              </select>
              <select className={inputCls} value={draft.scheme} aria-label="Skema klaim"
                onChange={(e) => setDraft((d) => ({ ...d, scheme: e.target.value as ClaimScheme }))}>
                {CLAIM_SCHEMES.map((s) => <option key={s} value={s}>{CLAIM_SCHEME_LABEL[s]}</option>)}
              </select>
              <select className={inputCls} value={draft.currency} aria-label="Mata uang"
                onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value as Currency }))}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Tanggungan (%)</span>
                <input className={inputCls} type="number" min={0} max={100} value={draft.coveragePercent}
                  onChange={(e) => setDraft((d) => ({ ...d, coveragePercent: e.target.value }))} aria-label="Persentase tanggungan" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Deductible</span>
                <input className={inputCls} type="number" min={0} value={draft.deductible}
                  onChange={(e) => setDraft((d) => ({ ...d, deductible: e.target.value }))} aria-label="Deductible" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Copay</span>
                <input className={inputCls} type="number" min={0} value={draft.copay}
                  onChange={(e) => setDraft((d) => ({ ...d, copay: e.target.value }))} aria-label="Copay" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Plafon (kosong = tanpa batas)</span>
                <input className={inputCls} type="number" min={0} value={draft.ceiling}
                  onChange={(e) => setDraft((d) => ({ ...d, ceiling: e.target.value }))} aria-label="Plafon" />
              </label>
              <div className="sm:col-span-2 lg:col-span-3">
                <Button onClick={add} disabled={busy || !complete}><Plus className="size-4" /> Simpan penjamin</Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Landmark className="size-4 text-primary" /> Daftar Penjamin</CardTitle>
            <Badge variant="muted">{payers.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {payers.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada penjamin terdaftar.</p>
            ) : (
              <ul className="divide-y divide-border">
                {payers.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{p.name}</span>
                        <Badge variant="muted">{PAYER_TYPE_LABEL[p.payerType]}</Badge>
                        <Badge variant={ELIGIBILITY_VARIANT[p.eligibilityStatus]}>{ELIGIBILITY_LABEL[p.eligibilityStatus]}</Badge>
                        {!p.active && <Badge variant="muted">nonaktif</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {CLAIM_SCHEME_LABEL[p.scheme]} · {p.currency} · tanggungan {p.coveragePercent}%
                        {p.deductible > 0 ? ` · deductible ${formatMoney(p.deductible, { currency: p.currency })}` : ""}
                        {p.ceiling != null ? ` · plafon ${formatMoney(p.ceiling, { currency: p.currency })}` : ""}
                      </p>
                    </div>
                    <Can permission="billing:manage">
                      <select className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                        value={p.eligibilityStatus} aria-label={`Eligibilitas ${p.name}`}
                        onChange={(e) => patch(p.id, { eligibilityStatus: e.target.value as EligibilityStatus })}>
                        {(Object.keys(ELIGIBILITY_LABEL) as EligibilityStatus[]).map((s) => (
                          <option key={s} value={s}>{ELIGIBILITY_LABEL[s]}</option>
                        ))}
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => patch(p.id, { active: !p.active })}>
                        {p.active ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                    </Can>
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

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-semibold tabular-nums ${accent ?? ""}`}>{value}</p>
    </div>
  );
}

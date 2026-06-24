"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, FileText, Plus, Receipt, Wallet } from "lucide-react";
import type { Tariff } from "@/lib/types";
import type { BillSummary, PaymentMethod } from "@/server/billing/charges";
import type { InacbgClaim } from "@/server/billing/inacbg";
import type { SepRecord } from "@/server/bpjs/sep";
import type { RujukanRecord } from "@/server/bpjs/referrals";
import type { CareClass } from "@/lib/inacbg";
import { CARE_CLASSES, CARE_CLASS_LABEL } from "@/lib/inacbg";
import { formatIDR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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

interface InacbgData {
  preview: {
    primaryDiagnosis: string | null;
    cbgCode: string;
    cbgDescription: string;
    tariffs: Record<CareClass, number>;
  };
  claim: InacbgClaim | null;
}
const CLAIM_VARIANT: Record<string, "muted" | "info" | "success" | "danger"> = {
  draft: "muted", submitted: "info", approved: "success", rejected: "danger",
};

export function BillingPanel({ encounterId }: { encounterId: string }) {
  const [summary, setSummary] = useState<BillSummary | null>(null);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [tariffId, setTariffId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [payAmount, setPayAmount] = useState("");
  const [inacbg, setInacbg] = useState<InacbgData | null>(null);
  const [careClass, setCareClass] = useState<CareClass>("3");
  const [sep, setSep] = useState<SepRecord | null>(null);
  const [rujukan, setRujukan] = useState<RujukanRecord | null>(null);
  const [noKartu, setNoKartu] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [checkingRujukan, setCheckingRujukan] = useState(false);
  const [rujukanError, setRujukanError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/encounters/${encounterId}/billing`);
    if (res.ok) setSummary(await res.json());
  }, [encounterId]);

  const loadInacbg = useCallback(async () => {
    const res = await fetch(`/api/encounters/${encounterId}/inacbg`);
    if (res.ok) setInacbg(await res.json());
  }, [encounterId]);

  const loadSep = useCallback(async () => {
    const res = await fetch(`/api/encounters/${encounterId}/bpjs-sep`);
    if (res.ok) {
      const data: { sep: SepRecord | null } = await res.json();
      setSep(data.sep);
    }
  }, [encounterId]);

  const loadRujukan = useCallback(async () => {
    const res = await fetch(`/api/encounters/${encounterId}/bpjs-rujukan`);
    if (res.ok) {
      const data: { rujukan: RujukanRecord | null } = await res.json();
      setRujukan(data.rujukan);
    }
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
    void loadInacbg();
    void loadSep();
    void loadRujukan();
  }, [load, loadTariffs, loadInacbg, loadSep, loadRujukan]);

  const issueSep = async () => {
    setIssuing(true);
    const res = await fetch(`/api/encounters/${encounterId}/bpjs-sep`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ noKartu }),
    });
    if (res.ok) {
      setNoKartu("");
      await loadSep();
    }
    setIssuing(false);
  };

  const checkRujukan = async () => {
    setCheckingRujukan(true);
    setRujukanError(null);
    const res = await fetch(`/api/encounters/${encounterId}/bpjs-rujukan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ noKartu }),
    });
    if (res.ok) {
      await loadRujukan();
    } else {
      const j = await res.json().catch(() => ({}));
      setRujukanError(j.error ?? "Gagal cek rujukan");
    }
    setCheckingRujukan(false);
  };

  const saveClaim = async () => {
    const res = await fetch(`/api/encounters/${encounterId}/inacbg`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ careClass }),
    });
    if (res.ok) await loadInacbg();
  };

  const setClaimStatus = async (claimId: string, status: string) => {
    const res = await fetch(`/api/encounters/${encounterId}/inacbg`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ claimId, status }),
    });
    if (res.ok) await loadInacbg();
  };

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

          {inacbg && (() => {
            const { preview, claim } = inacbg;
            const cls = claim ? claim.careClass : careClass;
            const paket = claim ? claim.tariff : preview.tariffs[careClass];
            const selisih = paket - summary.totalCharges;
            return (
              <div className="space-y-1.5 border-t border-border pt-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <FileText className="size-3.5" /> INA-CBG (estimasi)
                </span>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                    {preview.cbgCode}
                  </span>
                  <span className="min-w-0 flex-1">{preview.cbgDescription}</span>
                  {preview.primaryDiagnosis && (
                    <span className="text-xs text-muted-foreground">Dx: {preview.primaryDiagnosis}</span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tarif paket ({CARE_CLASS_LABEL[cls]})</span>
                    <span className="font-mono tabular-nums">{formatIDR(paket)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Selisih (paket − riil)</span>
                    <span
                      className={`font-mono tabular-nums ${
                        selisih >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {formatIDR(selisih)}
                    </span>
                  </div>
                </div>
                {claim ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Status klaim:</span>
                    <Badge variant={CLAIM_VARIANT[claim.status]}>{claim.status}</Badge>
                    <Can permission="billing:manage">
                      {claim.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => setClaimStatus(claim.id, "submitted")}>
                          Ajukan
                        </Button>
                      )}
                      {claim.status === "submitted" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setClaimStatus(claim.id, "approved")}>
                            Setujui
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setClaimStatus(claim.id, "rejected")}>
                            Tolak
                          </Button>
                        </>
                      )}
                    </Can>
                  </div>
                ) : (
                  <Can permission="billing:manage">
                    <div className="flex items-center gap-2">
                      <select
                        value={careClass}
                        onChange={(e) => setCareClass(e.target.value as CareClass)}
                        className={inputCls}
                        aria-label="Kelas perawatan"
                      >
                        {CARE_CLASSES.map((c) => (
                          <option key={c} value={c}>{CARE_CLASS_LABEL[c]}</option>
                        ))}
                      </select>
                      <Button size="sm" onClick={saveClaim}>Grouping &amp; Simpan Klaim</Button>
                    </div>
                  </Can>
                )}
              </div>
            );
          })()}

          <div className="space-y-1.5 border-t border-border pt-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <CreditCard className="size-3.5" /> BPJS — Rujukan
            </span>
            {rujukan ? (
              <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-semibold">{rujukan.noRujukan}</span>
                  {rujukan.isMock && <Badge variant="muted">mock</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rujukan.asalFaskes}{rujukan.tglRujukan ? ` · ${rujukan.tglRujukan}` : ""} · No. {rujukan.noKartu}
                </p>
                {rujukan.diagnosaKode && (
                  <p className="text-xs text-muted-foreground">
                    Dx rujukan: {rujukan.diagnosaKode} — {rujukan.diagnosaNama}
                  </p>
                )}
              </div>
            ) : (
              <Can permission="billing:manage">
                <div className="flex items-center gap-2">
                  <input
                    value={noKartu}
                    onChange={(e) => setNoKartu(e.target.value)}
                    placeholder="No. Kartu BPJS (13 digit)"
                    inputMode="numeric"
                    className={`${inputCls} min-w-0 flex-1`}
                    aria-label="Nomor kartu BPJS untuk rujukan"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={checkRujukan}
                    disabled={checkingRujukan || !/^\d{10,16}$/.test(noKartu.trim())}
                  >
                    Cek Rujukan
                  </Button>
                </div>
              </Can>
            )}
            {rujukanError && <p className="text-xs text-danger">{rujukanError}</p>}
          </div>

          <div className="space-y-1.5 border-t border-border pt-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <CreditCard className="size-3.5" /> BPJS — SEP
            </span>
            {sep ? (
              <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-semibold">{sep.sepNumber}</span>
                  {sep.isMock && <Badge variant="muted">mock</Badge>}
                  <Badge variant={sep.status === "issued" ? "success" : "danger"}>{sep.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sep.pesertaNama} · {sep.pesertaKelas} · {sep.pesertaStatus} · No. {sep.noKartu}
                </p>
                {sep.diagnosis && (
                  <p className="text-xs text-muted-foreground">Dx: {sep.diagnosis}</p>
                )}
              </div>
            ) : (
              <Can permission="billing:manage">
                <div className="flex items-center gap-2">
                  <input
                    value={noKartu}
                    onChange={(e) => setNoKartu(e.target.value)}
                    placeholder="No. Kartu BPJS (13 digit)"
                    inputMode="numeric"
                    className={`${inputCls} min-w-0 flex-1`}
                    aria-label="Nomor kartu BPJS"
                  />
                  <Button size="sm" onClick={issueSep} disabled={issuing || !/^\d{10,16}$/.test(noKartu.trim())}>
                    Terbitkan SEP
                  </Button>
                </div>
              </Can>
            )}
          </div>
        </>
      )}
    </div>
  );
}

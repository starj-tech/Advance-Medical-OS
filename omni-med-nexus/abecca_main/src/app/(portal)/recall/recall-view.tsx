"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PackageX, Plus, ShieldAlert, CheckCircle2 } from "lucide-react";
import type { InventoryReport } from "@/server/pharmacy/inventory";
import type { Recall, RecallSummary } from "@/server/pharmacy/recall";
import { recallImpact, RECALL_STATUS_LABEL, RECALL_STATUS_VARIANT } from "@/lib/recall";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

type FlatBatch = { batchNo: string; quantity: number; location: string | null };

export function RecallView() {
  const [report, setReport] = useState<InventoryReport | null>(null);
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [summary, setSummary] = useState<RecallSummary | null>(null);
  const [lotNo, setLotNo] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [inv, rc] = await Promise.all([
      fetch("/api/pharmacy/inventory"),
      fetch("/api/pharmacy/recall"),
    ]);
    if (inv.ok) setReport(await inv.json());
    if (rc.ok) {
      const j = await rc.json();
      setRecalls(j.recalls);
      setSummary(j.summary);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Flatten all in-stock batches; offer their distinct lot numbers as recall suggestions.
  const batches = useMemo<FlatBatch[]>(() => {
    const out: FlatBatch[] = [];
    for (const it of report?.items ?? []) {
      for (const b of it.batches) out.push({ batchNo: b.batchNo, quantity: b.quantity, location: b.location });
    }
    return out;
  }, [report]);
  const knownLots = useMemo(
    () => [...new Set(batches.filter((b) => b.quantity > 0).map((b) => b.batchNo))].sort(),
    [batches],
  );
  // Live impact preview of the lot being typed (before the recall is raised).
  const preview = useMemo(() => (lotNo.trim() ? recallImpact(batches, lotNo) : null), [batches, lotNo]);

  const issue = async () => {
    if (!lotNo.trim() || !reason.trim()) return;
    setBusy(true);
    setErr("");
    const res = await fetch("/api/pharmacy/recall", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ lotNo: lotNo.trim(), reason: reason.trim() }),
    });
    setBusy(false);
    if (res.ok) { setLotNo(""); setReason(""); await load(); }
    else { const j = await res.json().catch(() => ({})); setErr(j.error ?? "Gagal menerbitkan penarikan"); }
  };

  const withdraw = async (id: string) => {
    setBusy(true);
    const res = await fetch(`/api/pharmacy/recall/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "withdraw" }),
    });
    setBusy(false);
    if (res.ok) await load();
  };

  return (
    <Can permission="formulary:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke penarikan obat.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Penarikan Obat (Recall)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Telusuri satu nomor lot/batch di seluruh depo, lalu tarik stoknya dari peredaran (stok di-nol-kan).
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard icon={<ShieldAlert className="size-4 text-amber-600" />} label="Penarikan terbuka" value={summary?.open ?? 0} />
          <SummaryCard icon={<CheckCircle2 className="size-4 text-emerald-600" />} label="Sudah ditarik" value={summary?.completed ?? 0} />
          <SummaryCard icon={<PackageX className="size-4 text-rose-600" />} label="Total unit ditarik" value={summary?.totalWithdrawn ?? 0} />
        </div>

        <Can permission="formulary:dispense">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageX className="size-4 text-primary" /> Terbitkan Penarikan
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Nomor lot/batch *</span>
                <input className={inputCls} value={lotNo} placeholder="mis. BPC-2405" list="recall-lots"
                  onChange={(e) => setLotNo(e.target.value)} aria-label="Nomor lot" />
                <datalist id="recall-lots">
                  {knownLots.map((l) => <option key={l} value={l} />)}
                </datalist>
              </label>
              <input className={inputCls} value={reason} placeholder="Alasan penarikan (mis. recall BPOM) *"
                onChange={(e) => setReason(e.target.value)} aria-label="Alasan penarikan" />
              {preview && (
                <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                  <span className="text-[11px] text-muted-foreground">
                    Dampak: {preview.batchCount} batch · {preview.totalQuantity} unit
                  </span>
                  {Object.entries(preview.byLocation).map(([loc, qty]) => (
                    <Badge key={loc} variant="muted">{loc}: {qty}</Badge>
                  ))}
                  {preview.batchCount === 0 && (
                    <span className="text-[11px] text-muted-foreground">tidak ada stok aktif (penarikan pencegahan)</span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between sm:col-span-2">
                <span className="text-xs text-danger">{err}</span>
                <Button onClick={issue} disabled={busy || !lotNo.trim() || !reason.trim()}>
                  <Plus className="size-4" /> Terbitkan
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageX className="size-4 text-primary" /> Daftar Penarikan
            </CardTitle>
            <Badge variant="muted">{recalls.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {recalls.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada penarikan.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recalls.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
                    <Badge variant={RECALL_STATUS_VARIANT[r.status]}>{RECALL_STATUS_LABEL[r.status]}</Badge>
                    <span className="font-mono text-xs">{r.lotNo}</span>
                    <span className="text-sm font-medium">{r.itemName}</span>
                    <span className="text-xs text-muted-foreground">· {r.reason}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.status === "completed"
                        ? `${r.withdrawnQuantity} unit ditarik`
                        : `${r.batchCount} batch · ${r.totalQuantity} unit`}
                    </span>
                    <span className="ml-auto flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatDate(r.issuedAt)}</span>
                      {r.status === "open" && (
                        <Can permission="formulary:dispense">
                          <Button size="sm" variant="outline" onClick={() => withdraw(r.id)} disabled={busy}>
                            Tarik stok
                          </Button>
                        </Can>
                      )}
                    </span>
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

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <span className="grid size-9 place-items-center rounded-lg bg-muted">{icon}</span>
        <span className="flex flex-col">
          <span className="text-lg font-semibold tabular-nums">{value}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </span>
      </CardContent>
    </Card>
  );
}

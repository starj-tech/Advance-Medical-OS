"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Bug, ClipboardList, Plus } from "lucide-react";
import type { HaiCase, HaiRate } from "@/server/ppi/surveillance";
import { HAI_TYPES, HAI_TYPE_LABEL, HAI_DENOMINATOR_LABEL, type HaiType } from "@/lib/hai";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const thisMonth = () => new Date().toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);

export function InfectionControlView() {
  const [period, setPeriod] = useState(thisMonth());
  const [rates, setRates] = useState<HaiRate[]>([]);
  const [cases, setCases] = useState<HaiCase[]>([]);
  const [caseDraft, setCaseDraft] = useState({ patientId: "", haiType: "VAP" as HaiType, unit: "", onsetDate: today(), note: "" });
  const [denomDraft, setDenomDraft] = useState({ haiType: "VAP" as HaiType, unit: "", deviceDays: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [s, c] = await Promise.all([
      fetch(`/api/ppi/summary?period=${period}`),
      fetch(`/api/ppi/cases?period=${period}`),
    ]);
    if (s.ok) setRates(await s.json());
    if (c.ok) setCases(await c.json());
  }, [period]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const addCase = async () => {
    if (!caseDraft.patientId.trim() || !caseDraft.unit.trim() || !caseDraft.onsetDate) return;
    setBusy(true);
    const res = await fetch("/api/ppi/cases", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...caseDraft, note: caseDraft.note.trim() || null }),
    });
    setBusy(false);
    if (res.ok) { setCaseDraft({ patientId: "", haiType: "VAP", unit: "", onsetDate: today(), note: "" }); await load(); }
  };

  const addDenom = async () => {
    if (!denomDraft.unit.trim() || denomDraft.deviceDays === "") return;
    setBusy(true);
    const res = await fetch("/api/ppi/denominators", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ period, haiType: denomDraft.haiType, unit: denomDraft.unit.trim(), deviceDays: Number(denomDraft.deviceDays) }),
    });
    setBusy(false);
    if (res.ok) { setDenomDraft({ haiType: "VAP", unit: "", deviceDays: "" }); await load(); }
  };

  return (
    <Can permission="ikp:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke surveilans PPI.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">PPI — Surveilans Infeksi (HAIs)</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Insidens infeksi terkait layanan kesehatan per 1000 hari-alat — indikator mutu PPI/KARS.
            </p>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">Periode</span>
            <input type="month" className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Periode" />
          </label>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rates.map((r) => (
            <Card key={r.haiType} className="p-4">
              <Bug className="size-4 text-primary" />
              <p className="mt-3 text-2xl font-semibold tabular-nums">
                {r.ratePer1000 != null ? r.ratePer1000.toFixed(2) : "—"}
                <span className="ml-1 text-xs font-normal text-muted-foreground">/1000</span>
              </p>
              <p className="text-xs font-medium">{r.haiType}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {r.cases} kasus · {r.deviceDays} {HAI_DENOMINATOR_LABEL[r.haiType]}
              </p>
            </Card>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Can permission="ikp:report">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="size-4 text-primary" /> Catat Kasus HAI
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <input className={inputCls} value={caseDraft.patientId} placeholder="No. RM / pasien *"
                  onChange={(e) => setCaseDraft((d) => ({ ...d, patientId: e.target.value }))} aria-label="Pasien" />
                <select className={inputCls} value={caseDraft.haiType}
                  onChange={(e) => setCaseDraft((d) => ({ ...d, haiType: e.target.value as HaiType }))} aria-label="Jenis HAI">
                  {HAI_TYPES.map((t) => <option key={t} value={t}>{HAI_TYPE_LABEL[t]}</option>)}
                </select>
                <input className={inputCls} value={caseDraft.unit} placeholder="Unit (mis. ICU) *"
                  onChange={(e) => setCaseDraft((d) => ({ ...d, unit: e.target.value }))} aria-label="Unit" />
                <input type="date" className={inputCls} value={caseDraft.onsetDate}
                  onChange={(e) => setCaseDraft((d) => ({ ...d, onsetDate: e.target.value }))} aria-label="Tanggal onset" />
                <input className={inputCls} value={caseDraft.note} placeholder="Catatan (opsional)"
                  onChange={(e) => setCaseDraft((d) => ({ ...d, note: e.target.value }))} aria-label="Catatan" />
                <div>
                  <Button onClick={addCase} disabled={busy}><Plus className="size-4" /> Catat kasus</Button>
                </div>
              </CardContent>
            </Card>
          </Can>

          <Can permission="ikp:report">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="size-4 text-primary" /> Input Hari-Alat ({period})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <select className={inputCls} value={denomDraft.haiType}
                  onChange={(e) => setDenomDraft((d) => ({ ...d, haiType: e.target.value as HaiType }))} aria-label="Jenis HAI denominator">
                  {HAI_TYPES.map((t) => <option key={t} value={t}>{t} — {HAI_DENOMINATOR_LABEL[t]}</option>)}
                </select>
                <input className={inputCls} value={denomDraft.unit} placeholder="Unit (mis. ICU) *"
                  onChange={(e) => setDenomDraft((d) => ({ ...d, unit: e.target.value }))} aria-label="Unit denominator" />
                <input type="number" min={0} className={inputCls} value={denomDraft.deviceDays} placeholder="Jumlah hari-alat *"
                  onChange={(e) => setDenomDraft((d) => ({ ...d, deviceDays: e.target.value }))} aria-label="Jumlah hari-alat" />
                <div>
                  <Button onClick={addDenom} disabled={busy}><Plus className="size-4" /> Simpan denominator</Button>
                </div>
              </CardContent>
            </Card>
          </Can>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4 text-primary" /> Daftar Kasus · {period}
            </CardTitle>
            <Badge variant={cases.length ? "warning" : "success"}>{cases.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {cases.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Tidak ada kasus pada periode ini.</p>
            ) : (
              <ul className="divide-y divide-border">
                {cases.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <Badge variant="danger">{c.haiType}</Badge>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium">{c.patientId}</span>
                      <span className="text-sm text-muted-foreground"> · {c.unit}</span>
                      {c.note ? <p className="mt-0.5 text-xs text-muted-foreground">{c.note}</p> : null}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">Onset {formatDate(c.onsetDate)}</span>
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

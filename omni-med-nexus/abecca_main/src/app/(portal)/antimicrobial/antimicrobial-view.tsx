"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Pill, Plus } from "lucide-react";
import type { AntimicrobialSummary } from "@/server/ppi/antimicrobial";
import {
  ANTIBIOTICS, AWARE_CLASSES, AWARE_LABEL, AWARE_VARIANT, antibioticByCode,
} from "@/lib/antimicrobial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const thisMonth = () => new Date().toISOString().slice(0, 7);

export function AntimicrobialView() {
  const [period, setPeriod] = useState(thisMonth());
  const [summary, setSummary] = useState<AntimicrobialSummary | null>(null);
  const [consDraft, setConsDraft] = useState({ drugCode: ANTIBIOTICS[0].code, consumedGrams: "" });
  const [daysDraft, setDaysDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/ppi/antimicrobial/summary?period=${period}`);
    if (res.ok) setSummary(await res.json());
  }, [period]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const addConsumption = async () => {
    if (consDraft.consumedGrams === "" || Number(consDraft.consumedGrams) <= 0) return;
    setBusy(true);
    const res = await fetch("/api/ppi/antimicrobial/consumption", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ period, drugCode: consDraft.drugCode, consumedGrams: Number(consDraft.consumedGrams) }),
    });
    setBusy(false);
    if (res.ok) { setConsDraft({ drugCode: ANTIBIOTICS[0].code, consumedGrams: "" }); await load(); }
  };

  const saveDays = async () => {
    if (daysDraft === "" || Number(daysDraft) < 0) return;
    setBusy(true);
    const res = await fetch("/api/ppi/antimicrobial/patient-days", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ period, patientDays: Number(daysDraft) }),
    });
    setBusy(false);
    if (res.ok) { setDaysDraft(""); await load(); }
  };

  return (
    <Can permission="ikp:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke modul stewardship antimikroba.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Stewardship Antimikroba (PPRA)</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Konsumsi antibiotik dalam DDD per 100 hari-pasien + klasifikasi WHO AWaRe — indikator PPRA/KARS.
            </p>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">Periode</span>
            <input type="month" className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Periode" />
          </label>
        </div>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total konsumsi</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {summary?.totalDddPer100 != null ? summary.totalDddPer100.toFixed(2) : "—"}
              <span className="ml-1 text-xs font-normal text-muted-foreground">DDD/100 hari-pasien</span>
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{summary?.patientDays ?? 0} hari-pasien</p>
          </Card>
          {AWARE_CLASSES.map((cls) => (
            <Card key={cls} className="p-4">
              <Badge variant={AWARE_VARIANT[cls]}>{AWARE_LABEL[cls]}</Badge>
              <p className="mt-3 text-2xl font-semibold tabular-nums">
                {summary ? summary.awareShare[cls] : "—"}<span className="text-xs font-normal text-muted-foreground">%</span>
              </p>
              <p className="text-[11px] text-muted-foreground">dari total DDD</p>
            </Card>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Can permission="ikp:report">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="size-4 text-primary" /> Catat Konsumsi Antibiotik
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <select className={inputCls} value={consDraft.drugCode}
                  onChange={(e) => setConsDraft((d) => ({ ...d, drugCode: e.target.value }))} aria-label="Antibiotik">
                  {ANTIBIOTICS.map((a) => (
                    <option key={a.code} value={a.code}>{a.name} — {AWARE_LABEL[a.aware]} (DDD {a.dddStandard} g)</option>
                  ))}
                </select>
                <input type="number" min={0} step="0.1" className={inputCls} value={consDraft.consumedGrams} placeholder="Jumlah konsumsi (gram) *"
                  onChange={(e) => setConsDraft((d) => ({ ...d, consumedGrams: e.target.value }))} aria-label="Jumlah konsumsi gram" />
                <div>
                  <Button onClick={addConsumption} disabled={busy}><Plus className="size-4" /> Catat konsumsi</Button>
                </div>
              </CardContent>
            </Card>
          </Can>

          <Can permission="ikp:report">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="size-4 text-primary" /> Input Hari-Pasien ({period})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <input type="number" min={0} className={inputCls} value={daysDraft} placeholder="Total hari-pasien periode *"
                  onChange={(e) => setDaysDraft(e.target.value)} aria-label="Total hari-pasien" />
                <p className="text-[11px] text-muted-foreground">Denominator untuk normalisasi DDD per 100 hari-pasien.</p>
                <div>
                  <Button onClick={saveDays} disabled={busy}><Plus className="size-4" /> Simpan hari-pasien</Button>
                </div>
              </CardContent>
            </Card>
          </Can>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="size-4 text-primary" /> Konsumsi per Antibiotik · {period}
            </CardTitle>
            <Badge variant="muted">{summary?.drugs.length ?? 0}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {!summary || summary.drugs.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada konsumsi tercatat pada periode ini.</p>
            ) : (
              <ul className="divide-y divide-border">
                {summary.drugs.map((d) => (
                  <li key={d.drugCode} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <Badge variant={AWARE_VARIANT[d.aware]}>{AWARE_LABEL[d.aware]}</Badge>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium">{d.name}</span>
                      <span className="text-xs text-muted-foreground"> · {antibioticByCode(d.drugCode)?.code}</span>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {d.consumedGrams.toLocaleString("id-ID")} g · {d.ddd.toFixed(1)} DDD
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {d.dddPer100 != null ? d.dddPer100.toFixed(2) : "—"}
                      <span className="ml-1 text-[11px] font-normal text-muted-foreground">/100</span>
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

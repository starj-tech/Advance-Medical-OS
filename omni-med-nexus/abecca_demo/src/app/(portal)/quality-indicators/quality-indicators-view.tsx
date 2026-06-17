"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Target, TriangleAlert, Plus } from "lucide-react";
import type { InmReportRow } from "@/server/quality/inm";
import { INM_INDICATORS } from "@/lib/inm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const thisMonth = () => new Date().toISOString().slice(0, 7);

export function QualityIndicatorsView() {
  const [period, setPeriod] = useState(thisMonth());
  const [rows, setRows] = useState<InmReportRow[]>([]);
  const [draft, setDraft] = useState({ code: INM_INDICATORS[0].code, numerator: "", denominator: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/inm?period=${period}`);
    if (res.ok) setRows((await res.json()).indicators);
  }, [period]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const save = async () => {
    if (draft.numerator === "" || draft.denominator === "") return;
    setBusy(true);
    const res = await fetch("/api/inm", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ period, code: draft.code, numerator: Number(draft.numerator), denominator: Number(draft.denominator) }),
    });
    setBusy(false);
    if (res.ok) { setDraft((d) => ({ ...d, numerator: "", denominator: "" })); await load(); }
  };

  const met = rows.filter((r) => r.met === true).length;
  const notMet = rows.filter((r) => r.met === false).length;
  const notReported = rows.filter((r) => r.met === null).length;

  return (
    <Can permission="ikp:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke indikator mutu.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Indikator Nasional Mutu (INM)</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              13 indikator mutu wajib Kemenkes — capaian dihitung otomatis terhadap target nasional.
            </p>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">Periode</span>
            <input type="month" className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Periode" />
          </label>
        </div>

        <section className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{met}</p>
            <p className="text-xs text-muted-foreground">Tercapai</p>
          </Card>
          <Card className="p-4">
            <TriangleAlert className="size-4 text-rose-600 dark:text-rose-400" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{notMet}</p>
            <p className="text-xs text-muted-foreground">Belum tercapai</p>
          </Card>
          <Card className="p-4">
            <Target className="size-4 text-muted-foreground" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{notReported}</p>
            <p className="text-xs text-muted-foreground">Belum dilapor</p>
          </Card>
        </section>

        <Can permission="ikp:report">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-4 text-primary" /> Input Capaian · {period}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select className={`${inputCls} sm:col-span-2`} value={draft.code}
                onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))} aria-label="Indikator">
                {INM_INDICATORS.map((i) => <option key={i.code} value={i.code}>{i.code} — {i.name}</option>)}
              </select>
              <input type="number" min={0} className={inputCls} value={draft.numerator} placeholder="Numerator *"
                onChange={(e) => setDraft((d) => ({ ...d, numerator: e.target.value }))} aria-label="Numerator" />
              <input type="number" min={0} className={inputCls} value={draft.denominator} placeholder="Denominator *"
                onChange={(e) => setDraft((d) => ({ ...d, denominator: e.target.value }))} aria-label="Denominator" />
              <div className="lg:col-span-4">
                <Button onClick={save} disabled={busy || draft.numerator === "" || draft.denominator === ""}>
                  <Plus className="size-4" /> Simpan capaian
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-4 text-primary" /> Capaian INM · {period}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.code} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                      <span className="text-sm font-medium">{r.name}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Target {r.direction === "lower" ? "≤" : "≥"}{r.target}%
                      {r.numerator != null ? ` · ${r.numerator}/${r.denominator}` : " · belum dilapor"}
                    </p>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="block text-lg font-semibold tabular-nums">
                      {r.achievementPct != null ? `${r.achievementPct}%` : "—"}
                    </span>
                    {r.met === true && <Badge variant="success">Tercapai</Badge>}
                    {r.met === false && <Badge variant="danger">Belum tercapai</Badge>}
                    {r.met === null && <Badge variant="muted">Belum dilapor</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </Can>
  );
}

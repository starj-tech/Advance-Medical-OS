"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Radar } from "lucide-react";
import type { RiskView, RiskSummary } from "@/server/quality/risk-register";
import {
  RISK_BAND_LABEL, RISK_BAND_VARIANT,
  RISK_STATUS_LABEL, RISK_STATUS_VARIANT, RISK_STATUSES,
  RISK_CATEGORY_LABEL, RISK_CATEGORIES,
  LIKELIHOOD_LABEL, CONSEQUENCE_LABEL,
  riskScore, bandFor,
  type RiskBand, type RiskStatus, type RiskCategory,
} from "@/lib/risk-matrix";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const BAND_CELL: Record<RiskBand, string> = {
  low: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  moderate: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
  high: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  extreme: "bg-rose-200 text-rose-950 dark:bg-rose-950/60 dark:text-rose-200",
};
const AXIS = [1, 2, 3, 4, 5] as const;

const EMPTY = {
  title: "", category: "clinical" as RiskCategory, description: "",
  likelihood: "3", consequence: "3", owner: "", mitigation: "",
};

export function RiskRegisterView() {
  const [risks, setRisks] = useState<RiskView[]>([]);
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/risk-register");
    if (res.ok) {
      const j = await res.json();
      setRisks(j.risks);
      setSummary(j.summary);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const draftBand = bandFor(Number(draft.likelihood), Number(draft.consequence));
  const draftScore = riskScore(Number(draft.likelihood), Number(draft.consequence));
  const complete = draft.title.trim().length > 0;

  const add = async () => {
    if (!complete) return;
    setBusy(true);
    const res = await fetch("/api/risk-register", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: draft.title, category: draft.category, description: draft.description.trim() || null,
        likelihood: Number(draft.likelihood), consequence: Number(draft.consequence),
        owner: draft.owner.trim() || null, mitigation: draft.mitigation.trim() || null,
      }),
    });
    setBusy(false);
    if (res.ok) { setDraft(EMPTY); await load(); }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/risk-register/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) await load();
  };

  const matrix = summary?.matrix;

  return (
    <Can permission="ikp:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke register risiko.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Manajemen Risiko</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register risiko korporat dengan grading matriks 5×5 (kemungkinan × dampak) — pendukung akreditasi KARS/PMKP.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(["low", "moderate", "high", "extreme"] as RiskBand[]).map((b) => (
            <Card key={b} className="p-4">
              <Badge variant={RISK_BAND_VARIANT[b]}>{RISK_BAND_LABEL[b]}</Badge>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.byBand[b] ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Risiko terbuka</p>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radar className="size-4 text-primary" /> Matriks Risiko 5×5 (risiko terbuka)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="inline-grid grid-cols-[auto_repeat(5,3rem)] gap-1 text-center text-xs">
                <div />
                {AXIS.map((l) => (
                  <div key={l} className="pb-1 font-medium text-muted-foreground" title={LIKELIHOOD_LABEL[l]}>{l}</div>
                ))}
                {[5, 4, 3, 2, 1].map((c) => (
                  <div key={c} className="contents">
                    <div className="flex items-center justify-end pr-2 font-medium text-muted-foreground" title={CONSEQUENCE_LABEL[c as 1]}>{c}</div>
                    {AXIS.map((l) => {
                      const band = bandFor(l, c);
                      const count = matrix?.[l - 1]?.[c - 1] ?? 0;
                      return (
                        <div key={`${l}-${c}`} className={`grid h-12 place-items-center rounded-md ${BAND_CELL[band]}`} title={`Kemungkinan ${l} × Dampak ${c} = ${l * c} (${RISK_BAND_LABEL[band]})`}>
                          <span className="text-sm font-semibold tabular-nums">{count || ""}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Sumbu-X: kemungkinan (1–5) · Sumbu-Y: dampak (1–5). Warna sel = band grading; angka = jumlah risiko terbuka.
            </p>
          </CardContent>
        </Card>

        <Can permission="ikp:manage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-4 text-primary" /> Tambah Risiko
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <input className={`${inputCls} sm:col-span-2`} value={draft.title} placeholder="Judul risiko *"
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} aria-label="Judul risiko" />
              <select className={inputCls} value={draft.category} aria-label="Kategori"
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as RiskCategory }))}>
                {RISK_CATEGORIES.map((c) => <option key={c} value={c}>{RISK_CATEGORY_LABEL[c]}</option>)}
              </select>
              <input className={inputCls} value={draft.owner} placeholder="Pemilik risiko / unit"
                onChange={(e) => setDraft((d) => ({ ...d, owner: e.target.value }))} aria-label="Pemilik risiko" />
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Kemungkinan</span>
                <select className={inputCls} value={draft.likelihood} aria-label="Kemungkinan"
                  onChange={(e) => setDraft((d) => ({ ...d, likelihood: e.target.value }))}>
                  {AXIS.map((n) => <option key={n} value={n}>{n} — {LIKELIHOOD_LABEL[n]}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Dampak</span>
                <select className={inputCls} value={draft.consequence} aria-label="Dampak"
                  onChange={(e) => setDraft((d) => ({ ...d, consequence: e.target.value }))}>
                  {AXIS.map((n) => <option key={n} value={n}>{n} — {CONSEQUENCE_LABEL[n]}</option>)}
                </select>
              </label>
              <textarea className={`${inputCls} h-auto py-2 sm:col-span-2`} rows={2} value={draft.description} placeholder="Deskripsi (opsional)"
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} aria-label="Deskripsi" />
              <textarea className={`${inputCls} h-auto py-2 sm:col-span-2`} rows={2} value={draft.mitigation} placeholder="Rencana mitigasi (opsional)"
                onChange={(e) => setDraft((d) => ({ ...d, mitigation: e.target.value }))} aria-label="Mitigasi" />
              <div className="flex items-center justify-between sm:col-span-2">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  Skor: <span className="font-semibold tabular-nums text-foreground">{draftScore}</span>
                  <Badge variant={RISK_BAND_VARIANT[draftBand]}>{RISK_BAND_LABEL[draftBand]}</Badge>
                </span>
                <Button onClick={add} disabled={busy || !complete}>
                  <Plus className="size-4" /> Simpan risiko
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radar className="size-4 text-primary" /> Register Risiko
            </CardTitle>
            <Badge variant="muted">{risks.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {risks.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada risiko terdaftar.</p>
            ) : (
              <ul className="divide-y divide-border">
                {risks.map((r) => (
                  <li key={r.id} className="flex flex-col gap-2 px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={RISK_BAND_VARIANT[r.band]}>{RISK_BAND_LABEL[r.band]} · {r.score}</Badge>
                      <span className="text-sm font-medium">{r.title}</span>
                      <Badge variant="muted">{RISK_CATEGORY_LABEL[r.category]}</Badge>
                      <Badge variant={RISK_STATUS_VARIANT[r.status]}>{RISK_STATUS_LABEL[r.status]}</Badge>
                    </div>
                    {(r.owner || r.mitigation) && (
                      <p className="text-xs text-muted-foreground">
                        {r.owner ? `Pemilik: ${r.owner}` : ""}{r.owner && r.mitigation ? " · " : ""}{r.mitigation ? `Mitigasi: ${r.mitigation}` : ""}
                      </p>
                    )}
                    <Can permission="ikp:manage">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          Status
                          <select className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                            value={r.status} aria-label={`Status ${r.title}`}
                            onChange={(e) => patch(r.id, { status: e.target.value as RiskStatus })}>
                            {RISK_STATUSES.map((s) => <option key={s} value={s}>{RISK_STATUS_LABEL[s]}</option>)}
                          </select>
                        </label>
                        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          K
                          <select className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                            value={String(r.likelihood)} aria-label={`Kemungkinan ${r.title}`}
                            onChange={(e) => patch(r.id, { likelihood: Number(e.target.value) })}>
                            {AXIS.map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          D
                          <select className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                            value={String(r.consequence)} aria-label={`Dampak ${r.title}`}
                            onChange={(e) => patch(r.id, { consequence: Number(e.target.value) })}>
                            {AXIS.map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                      </div>
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

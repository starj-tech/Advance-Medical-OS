"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Star } from "lucide-react";
import type { Feedback, FeedbackSummary } from "@/server/quality/feedback";
import {
  FEEDBACK_SOURCES, FEEDBACK_SOURCE_LABEL,
  NPS_CATEGORY_LABEL, NPS_CATEGORY_VARIANT,
  npsCategory,
  type FeedbackSource,
} from "@/lib/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const NPS_SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const CSAT_SCORES = [1, 2, 3, 4, 5] as const;

const EMPTY = {
  source: "post_visit" as FeedbackSource, npsScore: "9", csatRating: "", patientId: "", comment: "",
};

export function FeedbackView() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/feedback");
    if (res.ok) {
      const j = await res.json();
      setFeedback(j.feedback);
      setSummary(j.summary);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const add = async () => {
    setBusy(true);
    const res = await fetch("/api/feedback", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: draft.source, npsScore: Number(draft.npsScore),
        csatRating: draft.csatRating ? Number(draft.csatRating) : null,
        patientId: draft.patientId.trim() || null, comment: draft.comment.trim() || null,
      }),
    });
    setBusy(false);
    if (res.ok) { setDraft(EMPTY); await load(); }
  };

  const npsDisplay = summary?.nps ?? null;
  const npsColor = npsDisplay === null ? "text-muted-foreground"
    : npsDisplay > 0 ? "text-emerald-600 dark:text-emerald-400"
    : npsDisplay < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground";

  return (
    <Can permission="ikp:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke modul umpan balik pasien.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Umpan Balik Pasien</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pengalaman pasien terukur — Net Promoter Score (NPS) & kepuasan (CSAT) dari survei. Pendukung akreditasi KARS (kepuasan pasien).
          </p>
        </div>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Net Promoter Score</p>
            <p className={`mt-2 text-3xl font-semibold tabular-nums ${npsColor}`}>{npsDisplay ?? "—"}</p>
            <p className="text-xs text-muted-foreground">skala −100…100</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Kepuasan (CSAT)</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {summary?.csatAverage ?? "—"}<span className="text-base text-muted-foreground">/5</span>
            </p>
            <p className="text-xs text-muted-foreground">{summary?.csatCount ?? 0} penilaian</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total respons</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{summary?.total ?? "—"}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Sebaran NPS</p>
            <div className="mt-2 flex flex-col gap-1 text-xs">
              <span className="flex justify-between"><span>Promotor</span><span className="font-semibold tabular-nums">{summary?.counts.promoter ?? 0}</span></span>
              <span className="flex justify-between"><span>Pasif</span><span className="font-semibold tabular-nums">{summary?.counts.passive ?? 0}</span></span>
              <span className="flex justify-between"><span>Detraktor</span><span className="font-semibold tabular-nums">{summary?.counts.detractor ?? 0}</span></span>
            </div>
          </Card>
        </section>

        <Can permission="ikp:report">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-4 text-primary" /> Catat Umpan Balik
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Sumber survei</span>
                <select className={inputCls} value={draft.source} aria-label="Sumber survei"
                  onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value as FeedbackSource }))}>
                  {FEEDBACK_SOURCES.map((s) => <option key={s} value={s}>{FEEDBACK_SOURCE_LABEL[s]}</option>)}
                </select>
              </label>
              <input className={inputCls} value={draft.patientId} placeholder="No. RM pasien (opsional)"
                onChange={(e) => setDraft((d) => ({ ...d, patientId: e.target.value }))} aria-label="No. RM pasien" />
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">NPS — seberapa mungkin merekomendasikan? (0–10)</span>
                <select className={inputCls} value={draft.npsScore} aria-label="Skor NPS"
                  onChange={(e) => setDraft((d) => ({ ...d, npsScore: e.target.value }))}>
                  {NPS_SCORES.map((n) => <option key={n} value={n}>{n} — {NPS_CATEGORY_LABEL[npsCategory(n)]}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">CSAT — kepuasan (1–5, opsional)</span>
                <select className={inputCls} value={draft.csatRating} aria-label="Penilaian CSAT"
                  onChange={(e) => setDraft((d) => ({ ...d, csatRating: e.target.value }))}>
                  <option value="">—</option>
                  {CSAT_SCORES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <textarea className={`${inputCls} h-auto py-2 sm:col-span-2`} rows={2} value={draft.comment} placeholder="Komentar pasien (opsional)"
                onChange={(e) => setDraft((d) => ({ ...d, comment: e.target.value }))} aria-label="Komentar" />
              <div className="flex justify-end sm:col-span-2">
                <Button onClick={add} disabled={busy}>
                  <Plus className="size-4" /> Simpan umpan balik
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="size-4 text-primary" /> Respons Terbaru
            </CardTitle>
            <Badge variant="muted">{feedback.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {feedback.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada umpan balik tercatat.</p>
            ) : (
              <ul className="divide-y divide-border">
                {feedback.map((f) => {
                  const cat = npsCategory(f.npsScore);
                  return (
                    <li key={f.id} className="flex flex-col gap-1 px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={NPS_CATEGORY_VARIANT[cat]}>NPS {f.npsScore} · {NPS_CATEGORY_LABEL[cat]}</Badge>
                        {f.csatRating !== null && <Badge variant="info">CSAT {f.csatRating}/5</Badge>}
                        <Badge variant="muted">{FEEDBACK_SOURCE_LABEL[f.source]}</Badge>
                        {f.patientId && <span className="text-xs text-muted-foreground">RM {f.patientId}</span>}
                      </div>
                      {f.comment && <p className="text-xs text-muted-foreground">{f.comment}</p>}
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

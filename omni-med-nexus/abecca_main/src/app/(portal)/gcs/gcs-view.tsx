"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Brain, Plus, AlertTriangle } from "lucide-react";
import type { Patient } from "@/lib/types";
import type { GcsAssessment, GcsSummary } from "@/server/clinical/gcs";
import {
  gcsScore, gcsSeverity, gcsNotation, GCS_SEVERITY_LABEL, GCS_SEVERITY_VARIANT,
  GCS_EYE, GCS_VERBAL, GCS_MOTOR, type GcsInput,
} from "@/lib/gcs";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const INIT: GcsInput = { eye: 4, verbal: 5, motor: 6 };

export function GcsView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [assessments, setAssessments] = useState<GcsAssessment[]>([]);
  const [summary, setSummary] = useState<GcsSummary | null>(null);
  const [patientId, setPatientId] = useState("");
  const [gcs, setGcs] = useState<GcsInput>(INIT);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const [pt, as] = await Promise.all([fetch("/api/patients"), fetch("/api/clinical/gcs")]);
    if (pt.ok) setPatients(await pt.json());
    if (as.ok) { const j = await as.json(); setAssessments(j.assessments); setSummary(j.summary); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const score = useMemo(() => gcsScore(gcs), [gcs]);
  const severity = gcsSeverity(score);
  const patientName = patients.find((p) => p.id === patientId)?.name ?? "";

  const submit = async () => {
    if (!patientId) { setErr("Pilih pasien dulu"); return; }
    setBusy(true); setErr("");
    const res = await fetch("/api/clinical/gcs", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ patientId, patientName, ...gcs, note: note.trim() || null }),
    });
    setBusy(false);
    if (res.ok) { setGcs(INIT); setNote(""); await load(); }
    else { const j = await res.json().catch(() => ({})); setErr(j.error ?? "Gagal menyimpan GCS"); }
  };

  return (
    <Can permission="nursing:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke asesmen GCS.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Glasgow Coma Scale (GCS)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Asesmen tingkat kesadaran (Eye/Verbal/Motor) — total 3–15, melengkapi EWS & acuity.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryCard icon={<Brain className="size-4 text-primary" />} label="Total asesmen" value={summary?.total ?? 0} />
          <SummaryCard icon={<AlertTriangle className="size-4 text-rose-600" />} label="GCS berat (≤8)" value={summary?.severe ?? 0} />
        </div>

        <Can permission="nursing:write">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="size-4 text-primary" /> Asesmen GCS
                <Badge variant={GCS_SEVERITY_VARIANT[severity]}>{gcsNotation(gcs)} = {score} · {GCS_SEVERITY_LABEL[severity]}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[11px] text-muted-foreground">Pasien *</span>
                <select className={inputCls} value={patientId} aria-label="Pasien" onChange={(e) => setPatientId(e.target.value)}>
                  <option value="">— pilih pasien —</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.ward}/{p.bed}</option>)}
                </select>
              </label>
              <ComponentSelect label="Eye (mata)" value={gcs.eye} opts={GCS_EYE} from={1}
                onChange={(v) => setGcs({ ...gcs, eye: v as GcsInput["eye"] })} />
              <ComponentSelect label="Verbal" value={gcs.verbal} opts={GCS_VERBAL} from={1}
                onChange={(v) => setGcs({ ...gcs, verbal: v as GcsInput["verbal"] })} />
              <ComponentSelect label="Motor" value={gcs.motor} opts={GCS_MOTOR} from={1}
                onChange={(v) => setGcs({ ...gcs, motor: v as GcsInput["motor"] })} />
              <input className={inputCls} value={note} placeholder="Catatan (opsional)"
                onChange={(e) => setNote(e.target.value)} aria-label="Catatan" />
              <div className="flex items-center justify-between sm:col-span-2">
                <span className="text-xs text-danger">{err}</span>
                <Button onClick={submit} disabled={busy || !patientId}>
                  <Plus className="size-4" /> Simpan GCS
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="size-4 text-primary" /> Riwayat GCS</CardTitle>
            <Badge variant="muted">{assessments.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {assessments.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada asesmen GCS.</p>
            ) : (
              <ul className="divide-y divide-border">
                {assessments.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
                    <Badge variant={GCS_SEVERITY_VARIANT[a.severity as keyof typeof GCS_SEVERITY_VARIANT] ?? "muted"}>
                      {GCS_SEVERITY_LABEL[a.severity as keyof typeof GCS_SEVERITY_LABEL] ?? a.severity}
                    </Badge>
                    <span className="font-mono text-xs">{a.notation}</span>
                    <span className="text-sm font-semibold tabular-nums">= {a.score}</span>
                    <span className="text-sm">{a.patientName}</span>
                    {a.note && <span className="text-xs text-muted-foreground">· {a.note}</span>}
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatDate(a.assessedAt)}</span>
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

function ComponentSelect({ label, value, opts, from, onChange }: {
  label: string; value: number; opts: string[]; from: number; onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <select className={inputCls} value={value} aria-label={label} onChange={(e) => onChange(Number(e.target.value))}>
        {opts.map((t, n) => n < from ? null : <option key={n} value={n}>{t}</option>)}
      </select>
    </label>
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

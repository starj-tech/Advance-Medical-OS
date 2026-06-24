"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PersonStanding, ShieldPlus, ClipboardList, Plus } from "lucide-react";
import type { Patient } from "@/lib/types";
import type { NursingAssessment, AssessmentSummary } from "@/server/clinical/nursing-assessments";
import {
  morseScore, morseRisk, MORSE_RISK_LABEL, MORSE_RISK_VARIANT,
  bradenScore, bradenRisk, BRADEN_RISK_LABEL, BRADEN_RISK_VARIANT,
  SCALE_LABEL, type MorseInput, type BradenInput, type ScaleKind,
} from "@/lib/nursing-scales";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const MORSE_INIT: MorseInput = {
  historyOfFalling: false, secondaryDiagnosis: false, ambulatoryAid: "none",
  ivTherapy: false, gait: "normal", mentalStatus: "oriented",
};
const BRADEN_INIT: BradenInput = {
  sensoryPerception: 4, moisture: 4, activity: 4, mobility: 4, nutrition: 4, frictionShear: 3,
};

const AMBULATORY_OPTS = [
  { v: "none", t: "Tidak ada / tirah baring (0)" },
  { v: "crutches", t: "Tongkat / kruk / walker (15)" },
  { v: "furniture", t: "Berpegangan furnitur (30)" },
] as const;
const GAIT_OPTS = [
  { v: "normal", t: "Normal / tirah baring (0)" },
  { v: "weak", t: "Lemah (10)" },
  { v: "impaired", t: "Terganggu (20)" },
] as const;
const MENTAL_OPTS = [
  { v: "oriented", t: "Sadar kemampuan diri (0)" },
  { v: "forgets", t: "Lupa keterbatasan (15)" },
] as const;

// Braden subscale descriptors (index 0 unused; point = array index).
const BRADEN_FIELDS: { key: keyof BradenInput; label: string; opts: string[] }[] = [
  { key: "sensoryPerception", label: "Persepsi sensorik", opts: ["", "Tidak merespon", "Sangat terbatas", "Sedikit terbatas", "Tidak terganggu"] },
  { key: "moisture", label: "Kelembapan", opts: ["", "Selalu lembap", "Sering lembap", "Kadang lembap", "Jarang lembap"] },
  { key: "activity", label: "Aktivitas", opts: ["", "Tirah baring", "Duduk", "Jalan kadang", "Jalan sering"] },
  { key: "mobility", label: "Mobilitas", opts: ["", "Imobil total", "Sangat terbatas", "Sedikit terbatas", "Tidak terbatas"] },
  { key: "nutrition", label: "Nutrisi", opts: ["", "Sangat buruk", "Kurang", "Adekuat", "Baik"] },
  { key: "frictionShear", label: "Gesekan & geseran", opts: ["", "Bermasalah", "Potensi masalah", "Tanpa masalah"] },
];

export function AssessmentsView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [assessments, setAssessments] = useState<NursingAssessment[]>([]);
  const [summary, setSummary] = useState<AssessmentSummary | null>(null);
  const [patientId, setPatientId] = useState("");
  const [morse, setMorse] = useState<MorseInput>(MORSE_INIT);
  const [braden, setBraden] = useState<BradenInput>(BRADEN_INIT);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const [pt, as] = await Promise.all([fetch("/api/patients"), fetch("/api/nursing/assessments")]);
    if (pt.ok) setPatients(await pt.json());
    if (as.ok) { const j = await as.json(); setAssessments(j.assessments); setSummary(j.summary); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const mScore = useMemo(() => morseScore(morse), [morse]);
  const mBand = morseRisk(mScore);
  const bScore = useMemo(() => bradenScore(braden), [braden]);
  const bBand = bradenRisk(bScore);
  const patientName = patients.find((p) => p.id === patientId)?.name ?? "";

  const submit = async (scale: ScaleKind, items: MorseInput | BradenInput) => {
    if (!patientId) { setErr("Pilih pasien dulu"); return; }
    setBusy(true); setErr("");
    const res = await fetch("/api/nursing/assessments", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ patientId, patientName, scale, items }),
    });
    setBusy(false);
    if (res.ok) {
      if (scale === "morse") setMorse(MORSE_INIT); else setBraden(BRADEN_INIT);
      await load();
    } else { const j = await res.json().catch(() => ({})); setErr(j.error ?? "Gagal menyimpan asesmen"); }
  };

  return (
    <Can permission="nursing:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke asesmen risiko keperawatan.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Asesmen Risiko Keperawatan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Skala Morse (risiko jatuh) & Braden (risiko dekubitus) — sasaran keselamatan pasien KARS.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard icon={<ClipboardList className="size-4 text-primary" />} label="Total asesmen" value={summary?.total ?? 0} />
          <SummaryCard icon={<PersonStanding className="size-4 text-rose-600" />} label="Risiko tinggi" value={summary?.highRisk ?? 0} />
          <SummaryCard icon={<ShieldPlus className="size-4 text-sky-600" />} label="Morse / Braden" value={`${summary?.byScale.morse ?? 0} / ${summary?.byScale.braden ?? 0}`} />
        </div>

        <Can permission="nursing:write">
          <Card>
            <CardHeader><CardTitle>Pasien yang dinilai</CardTitle></CardHeader>
            <CardContent>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Pilih pasien *</span>
                <select className={inputCls} value={patientId} aria-label="Pasien"
                  onChange={(e) => setPatientId(e.target.value)}>
                  <option value="">— pilih pasien —</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} · {p.ward}/{p.bed}</option>
                  ))}
                </select>
              </label>
              {err && <p className="mt-2 text-xs text-danger">{err}</p>}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Morse Fall Scale */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PersonStanding className="size-4 text-primary" /> {SCALE_LABEL.morse}
                </CardTitle>
                <Badge variant={MORSE_RISK_VARIANT[mBand]}>{mScore} · {MORSE_RISK_LABEL[mBand]}</Badge>
              </CardHeader>
              <CardContent className="grid gap-3">
                <CheckRow label="Riwayat jatuh (25)" checked={morse.historyOfFalling}
                  onChange={(v) => setMorse({ ...morse, historyOfFalling: v })} />
                <CheckRow label="Diagnosis sekunder ≥2 (15)" checked={morse.secondaryDiagnosis}
                  onChange={(v) => setMorse({ ...morse, secondaryDiagnosis: v })} />
                <CheckRow label="Terpasang infus / heparin lock (20)" checked={morse.ivTherapy}
                  onChange={(v) => setMorse({ ...morse, ivTherapy: v })} />
                <SelectRow label="Alat bantu jalan" value={morse.ambulatoryAid}
                  opts={AMBULATORY_OPTS} onChange={(v) => setMorse({ ...morse, ambulatoryAid: v as MorseInput["ambulatoryAid"] })} />
                <SelectRow label="Gaya berjalan" value={morse.gait}
                  opts={GAIT_OPTS} onChange={(v) => setMorse({ ...morse, gait: v as MorseInput["gait"] })} />
                <SelectRow label="Status mental" value={morse.mentalStatus}
                  opts={MENTAL_OPTS} onChange={(v) => setMorse({ ...morse, mentalStatus: v as MorseInput["mentalStatus"] })} />
                <Button className="mt-1" onClick={() => submit("morse", morse)} disabled={busy || !patientId}>
                  <Plus className="size-4" /> Simpan Morse
                </Button>
              </CardContent>
            </Card>

            {/* Braden Scale */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldPlus className="size-4 text-primary" /> {SCALE_LABEL.braden}
                </CardTitle>
                <Badge variant={BRADEN_RISK_VARIANT[bBand]}>{bScore} · {BRADEN_RISK_LABEL[bBand]}</Badge>
              </CardHeader>
              <CardContent className="grid gap-3">
                {BRADEN_FIELDS.map((f) => (
                  <label key={f.key} className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground">{f.label}</span>
                    <select className={inputCls} value={braden[f.key]} aria-label={f.label}
                      onChange={(e) => setBraden({ ...braden, [f.key]: Number(e.target.value) } as BradenInput)}>
                      {f.opts.map((t, n) => n === 0 ? null : (
                        <option key={n} value={n}>{n} – {t}</option>
                      ))}
                    </select>
                  </label>
                ))}
                <Button className="mt-1" onClick={() => submit("braden", braden)} disabled={busy || !patientId}>
                  <Plus className="size-4" /> Simpan Braden
                </Button>
              </CardContent>
            </Card>
          </div>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4 text-primary" /> Riwayat Asesmen
            </CardTitle>
            <Badge variant="muted">{assessments.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {assessments.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada asesmen.</p>
            ) : (
              <ul className="divide-y divide-border">
                {assessments.map((a) => {
                  const variant = a.scale === "morse"
                    ? MORSE_RISK_VARIANT[a.band as keyof typeof MORSE_RISK_VARIANT]
                    : BRADEN_RISK_VARIANT[a.band as keyof typeof BRADEN_RISK_VARIANT];
                  const bandLabel = a.scale === "morse"
                    ? MORSE_RISK_LABEL[a.band as keyof typeof MORSE_RISK_LABEL]
                    : BRADEN_RISK_LABEL[a.band as keyof typeof BRADEN_RISK_LABEL];
                  return (
                    <li key={a.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
                      <Badge variant="info">{SCALE_LABEL[a.scale]}</Badge>
                      <span className="text-sm font-medium">{a.patientName}</span>
                      <span className="text-xs text-muted-foreground">skor {a.score}</span>
                      <Badge variant={variant ?? "muted"}>{bandLabel ?? a.band}</Badge>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatDate(a.assessedAt)}</span>
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

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
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

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-border text-primary focus:ring-primary/30" />
      {label}
    </label>
  );
}

function SelectRow({ label, value, opts, onChange }: {
  label: string; value: string; opts: readonly { v: string; t: string }[]; onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <select className={inputCls} value={value} aria-label={label} onChange={(e) => onChange(e.target.value)}>
        {opts.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
      </select>
    </label>
  );
}

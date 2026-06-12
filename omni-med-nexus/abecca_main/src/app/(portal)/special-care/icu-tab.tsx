"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Plus } from "lucide-react";
import { computeApache, type ApacheInputs, type ChronicHealth } from "@/lib/apache";
import type { IcuAssessment } from "@/server/clinical/icu";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

/** Normal-adult defaults so a quick assessment only edits the deranged values. */
const DEFAULTS: ApacheInputs = {
  temperatureC: 37, meanArterialPressure: 85, heartRate: 80, respiratoryRate: 16,
  pao2: 90, arterialPh: 7.4, sodium: 140, potassium: 4, creatinineMgDl: 1,
  acuteRenalFailure: false, hematocrit: 40, wbc: 8, gcs: 15, age: 50,
  chronicHealth: "none",
};

const FIELDS: { key: keyof ApacheInputs; label: string; step?: string }[] = [
  { key: "temperatureC", label: "Suhu (°C)", step: "0.1" },
  { key: "meanArterialPressure", label: "MAP (mmHg)" },
  { key: "heartRate", label: "Nadi (x/mnt)" },
  { key: "respiratoryRate", label: "Napas (x/mnt)" },
  { key: "pao2", label: "PaO₂ (mmHg)" },
  { key: "arterialPh", label: "pH arteri", step: "0.01" },
  { key: "sodium", label: "Na (mmol/L)" },
  { key: "potassium", label: "K (mmol/L)", step: "0.1" },
  { key: "creatinineMgDl", label: "Kreatinin (mg/dL)", step: "0.1" },
  { key: "hematocrit", label: "Hematokrit (%)" },
  { key: "wbc", label: "Leukosit (10³/µL)", step: "0.1" },
  { key: "gcs", label: "GCS (3–15)" },
  { key: "age", label: "Usia (tahun)" },
];

const CHRONIC_LABEL: Record<ChronicHealth, string> = {
  none: "Tanpa insufisiensi organ berat",
  elective_postop: "Pasca-op elektif + insufisiensi organ",
  nonop_or_emergency_postop: "Non-operatif / pasca-op darurat + insufisiensi organ",
};

const scoreVariant = (s: number): "success" | "info" | "warning" | "danger" =>
  s >= 25 ? "danger" : s >= 15 ? "warning" : s >= 10 ? "info" : "success";

export function IcuTab() {
  const [assessments, setAssessments] = useState<IcuAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState("");
  const [inputs, setInputs] = useState<ApacheInputs>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/icu/assessments");
    setAssessments(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Live preview from the same shared calculator the server persists with.
  const preview = useMemo(() => computeApache(inputs), [inputs]);

  const setNum = (key: keyof ApacheInputs, raw: string) =>
    setInputs((cur) => ({ ...cur, [key]: raw === "" ? Number.NaN : Number(raw) }));

  const valid =
    patientId.trim().length > 0 &&
    FIELDS.every(({ key }) => Number.isFinite(inputs[key] as number));

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    const res = await fetch("/api/icu/assessments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patientId: patientId.trim(), inputs }),
    });
    setSaving(false);
    if (res.ok) {
      setPatientId("");
      setInputs(DEFAULTS);
      await load();
    }
  };

  // Severity board: sickest on top.
  const board = [...assessments].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-6">
      <Can permission="icu:assess">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-4 text-primary" /> Penilaian APACHE II Baru
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={scoreVariant(preview.score)}>Skor {preview.score}</Badge>
              <Badge variant="muted">± {preview.estimatedMortality}% mortalitas</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <label className="text-xs font-medium text-muted-foreground sm:col-span-2">
                ID Pasien
                <input
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="PAT-123"
                  className={`${inputCls} mt-1`}
                />
              </label>
              {FIELDS.map(({ key, label, step }) => (
                <label key={key} className="text-xs font-medium text-muted-foreground">
                  {label}
                  <input
                    type="number"
                    step={step ?? "1"}
                    value={Number.isFinite(inputs[key] as number) ? String(inputs[key]) : ""}
                    onChange={(e) => setNum(key, e.target.value)}
                    className={`${inputCls} mt-1`}
                  />
                </label>
              ))}
              <label className="text-xs font-medium text-muted-foreground sm:col-span-2">
                Status kesehatan kronis
                <select
                  value={inputs.chronicHealth}
                  onChange={(e) =>
                    setInputs((cur) => ({ ...cur, chronicHealth: e.target.value as ChronicHealth }))
                  }
                  className={`${inputCls} mt-1`}
                >
                  {(Object.keys(CHRONIC_LABEL) as ChronicHealth[]).map((c) => (
                    <option key={c} value={c}>{CHRONIC_LABEL[c]}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-end gap-2 pb-2 text-xs font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={inputs.acuteRenalFailure ?? false}
                  onChange={(e) =>
                    setInputs((cur) => ({ ...cur, acuteRenalFailure: e.target.checked }))
                  }
                  className="size-4 accent-[var(--primary)]"
                />
                Gagal ginjal akut
              </label>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Fisiologis {preview.physiologicPoints} + usia {preview.agePoints} + kronis{" "}
                {preview.chronicPoints}. Estimasi mortalitas bersifat orientatif.
              </p>
              <Button onClick={submit} disabled={!valid || saving}>
                {saving ? "Menyimpan…" : "Simpan penilaian"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Can>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4 text-primary" /> Papan Keparahan ICU
          </CardTitle>
          <Badge variant="muted">{assessments.length} penilaian</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Memuat…</p>
          ) : board.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">
              Belum ada penilaian APACHE II.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {board.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">Pasien {a.patientId}</span>
                      <Badge variant={scoreVariant(a.score)}>APACHE II {a.score}</Badge>
                      <Badge variant="muted">± {a.estimatedMortality}%</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Fisiologis {a.physiologicPoints} · usia {a.agePoints} · kronis{" "}
                      {a.chronicPoints} · GCS {a.inputs.gcs} · {formatDateTime(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

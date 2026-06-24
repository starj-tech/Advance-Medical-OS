"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Baby, Plus, TriangleAlert, Info } from "lucide-react";
import type { Patient } from "@/lib/types";
import type { DoseCalculation } from "@/server/clinical/pediatric-dosing";
import { PEDS_DRUGS, drugByCode, isValidWeight, doseFor } from "@/lib/pediatric-dosing";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

export function DosingView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [calculations, setCalculations] = useState<DoseCalculation[]>([]);
  const [patientId, setPatientId] = useState("");
  const [drugCode, setDrugCode] = useState(PEDS_DRUGS[0].code);
  const [weight, setWeight] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const [pt, dc] = await Promise.all([fetch("/api/patients"), fetch("/api/clinical/dosing")]);
    if (pt.ok) setPatients(await pt.json());
    if (dc.ok) setCalculations((await dc.json()).calculations);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const drug = drugByCode(drugCode);
  const weightKg = Number(weight);
  // Live preview when the weight is valid.
  const preview = useMemo(
    () => (drug && isValidWeight(weightKg) ? doseFor(drug, weightKg) : null),
    [drug, weightKg],
  );
  const patientName = patients.find((p) => p.id === patientId)?.name ?? "";

  const submit = async () => {
    if (!patientId) { setErr("Pilih pasien dulu"); return; }
    if (!isValidWeight(weightKg)) { setErr("Berat badan harus > 0 dan ≤ 100 kg"); return; }
    setBusy(true); setErr("");
    const res = await fetch("/api/clinical/dosing", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ patientId, patientName, drugCode, weightKg }),
    });
    setBusy(false);
    if (res.ok) { setWeight(""); await load(); }
    else { const j = await res.json().catch(() => ({})); setErr(j.error ?? "Gagal menyimpan perhitungan"); }
  };

  return (
    <Can permission="medication:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke kalkulator dosis.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dosis Pediatrik (berbasis berat badan)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hitung dosis anak per mg/kg dengan plafon dosis dewasa — mencegah saran dosis berlebih.
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>Nilai referensi bersifat <b>ilustratif</b> — selalu verifikasi dengan formularium resmi / apoteker sebelum meresepkan.</span>
        </div>

        <Can permission="medication:order">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Baby className="size-4 text-primary" /> Hitung Dosis</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 sm:col-span-3">
                <span className="text-[11px] text-muted-foreground">Pasien *</span>
                <select className={inputCls} value={patientId} aria-label="Pasien" onChange={(e) => setPatientId(e.target.value)}>
                  <option value="">— pilih pasien —</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.ward}/{p.bed}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Obat</span>
                <select className={inputCls} value={drugCode} aria-label="Obat" onChange={(e) => setDrugCode(e.target.value)}>
                  {PEDS_DRUGS.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
                </select>
              </label>
              <input type="number" min={0.1} step={0.1} className={inputCls} value={weight} placeholder="Berat badan (kg) *"
                onChange={(e) => setWeight(e.target.value)} aria-label="Berat badan" />
              {drug && (
                <span className="flex items-center text-xs text-muted-foreground">
                  {drug.mgPerKgPerDose} mg/kg/dosis · {drug.frequencyPerDay}×/hari · {drug.route}
                </span>
              )}
              {preview && drug && (
                <div className="flex flex-col gap-1 rounded-lg bg-muted px-3 py-2 text-sm sm:col-span-3">
                  <span className="font-medium">
                    {drug.name}: <span className="tabular-nums">{preview.perDose} mg</span> / dosis × {preview.frequencyPerDay} = <span className="tabular-nums">{preview.perDay} mg</span> / hari
                  </span>
                  {(preview.perDoseCapped || preview.perDayCapped) && (
                    <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                      <TriangleAlert className="size-3.5" /> Dibatasi plafon dosis dewasa
                      ({preview.perDoseCapped ? `≤ ${drug.maxMgPerDose} mg/dosis` : `≤ ${drug.maxMgPerDay} mg/hari`}).
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between sm:col-span-3">
                <span className="text-xs text-danger">{err}</span>
                <Button onClick={submit} disabled={busy || !patientId || !preview}>
                  <Plus className="size-4" /> Simpan
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Baby className="size-4 text-primary" /> Riwayat Perhitungan</CardTitle>
            <Badge variant="muted">{calculations.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {calculations.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada perhitungan dosis.</p>
            ) : (
              <ul className="divide-y divide-border">
                {calculations.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
                    <span className="text-sm font-medium">{c.drugName}</span>
                    <span className="text-xs text-muted-foreground">{c.weightKg} kg →</span>
                    <span className="text-sm tabular-nums">{c.perDose} mg × {c.frequencyPerDay} = {c.perDay} mg/hari</span>
                    {c.capped && <Badge variant="warning">plafon</Badge>}
                    <span className="text-xs text-muted-foreground">· {c.patientName}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatDate(c.computedAt)}</span>
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

"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import type { Patient } from "@/lib/types";
import { recordVitals } from "@/lib/store";
import { acuityFromEws, acuityMeta, computeEws } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const fields = [
  { key: "heartRate", label: "Heart Rate", unit: "bpm", min: 20, max: 250 },
  { key: "systolicBp", label: "Systolic BP", unit: "mmHg", min: 50, max: 260 },
  { key: "respiratoryRate", label: "Resp. Rate", unit: "/min", min: 4, max: 60 },
  { key: "temperature", label: "Temperature", unit: "°C", min: 30, max: 43, step: 0.1 },
  { key: "spo2", label: "SpO₂", unit: "%", min: 50, max: 100 },
] as const;

type RawVitals = {
  heartRate: number;
  systolicBp: number;
  respiratoryRate: number;
  temperature: number;
  spo2: number;
};

export function RecordVitalsDialog({
  patient,
  open,
  onClose,
}: {
  patient: Patient;
  open: boolean;
  onClose: () => void;
}) {
  const [values, setValues] = useState<RawVitals>({
    heartRate: patient.vitals.heartRate,
    systolicBp: patient.vitals.systolicBp,
    respiratoryRate: patient.vitals.respiratoryRate,
    temperature: patient.vitals.temperature,
    spo2: patient.vitals.spo2,
  });

  const previewEws = computeEws(values);
  const previewAcuity = acuityFromEws(previewEws);
  const meta = acuityMeta[previewAcuity];

  const submit = () => {
    recordVitals(patient.id, values);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Record Vitals"
      description={`${patient.name} · ${patient.id}`}
    >
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              {f.label} <span className="opacity-60">({f.unit})</span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={f.min}
              max={f.max}
              step={"step" in f ? f.step : 1}
              value={values[f.key]}
              onChange={(e) =>
                setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }))
              }
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm tabular-nums outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </label>
        ))}
      </div>

      {/* Live EWS preview */}
      <div
        className={`mt-4 flex items-center gap-3 rounded-lg px-4 py-3 ${meta.bg}`}
      >
        <Activity className={`size-5 ${meta.text}`} />
        <div className="flex-1">
          <p className="text-sm font-medium">
            Projected EWS: <span className="tabular-nums">{previewEws}</span>
          </p>
          <p className={`text-xs ${meta.text}`}>{meta.label}</p>
        </div>
        <span className={`size-2.5 rounded-full ${meta.dot}`} />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit}>Save vitals</Button>
      </div>
    </Dialog>
  );
}

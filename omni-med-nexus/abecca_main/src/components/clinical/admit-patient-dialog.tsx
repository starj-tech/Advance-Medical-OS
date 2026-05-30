"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { admitPatient } from "@/lib/store";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const wards = ["ICU", "Cardiology", "Pulmonology", "General", "Emergency"];

export function AdmitPatientDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [age, setAge] = useState(50);
  const [sex, setSex] = useState<"male" | "female">("male");
  const [ward, setWard] = useState(wards[0]);
  const [bed, setBed] = useState("");
  const [allergies, setAllergies] = useState("");
  const [vitals, setVitals] = useState({
    heartRate: 80,
    systolicBp: 120,
    respiratoryRate: 16,
    temperature: 36.8,
    spo2: 98,
  });

  const reset = () => {
    setName("");
    setAge(50);
    setSex("male");
    setWard(wards[0]);
    setBed("");
    setAllergies("");
    setVitals({ heartRate: 80, systolicBp: 120, respiratoryRate: 16, temperature: 36.8, spo2: 98 });
  };

  const valid = name.trim().length > 1 && bed.trim().length > 0;

  const submit = () => {
    if (!valid) return;
    const id = admitPatient({
      name: name.trim(),
      age,
      sex,
      ward,
      bed: bed.trim(),
      allergies: allergies
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      vitals,
    });
    reset();
    onClose();
    router.push(`/patients/${id}`);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Admit Patient"
      description="Create a new admission. An audit block is recorded on save."
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Full name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Andi Wijaya"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Age</span>
            <input
              type="number"
              min={0}
              max={120}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm tabular-nums outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Sex</span>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as "male" | "female")}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Ward</span>
            <select
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              {wards.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Bed</span>
            <input
              value={bed}
              onChange={(e) => setBed(e.target.value)}
              placeholder="e.g. ICU-05"
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Allergies <span className="opacity-60">(comma-separated)</span>
          </span>
          <input
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="e.g. Penicillin, Aspirin"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </label>

        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-1 text-xs font-medium text-muted-foreground">
            Initial vitals
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["heartRate", "HR"],
              ["systolicBp", "SBP"],
              ["respiratoryRate", "RR"],
              ["temperature", "Temp"],
              ["spo2", "SpO₂"],
            ] as const).map(([key, short]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">{short}</span>
                <input
                  type="number"
                  step={key === "temperature" ? 0.1 : 1}
                  value={vitals[key]}
                  onChange={(e) =>
                    setVitals((v) => ({ ...v, [key]: Number(e.target.value) }))
                  }
                  className="h-9 rounded-lg border border-border bg-background px-2 text-sm tabular-nums outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!valid}>
          Admit patient
        </Button>
      </div>
    </Dialog>
  );
}

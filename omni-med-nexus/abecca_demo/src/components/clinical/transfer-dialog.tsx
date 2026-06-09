"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Patient } from "@/lib/types";
import { transferPatient } from "@/lib/store";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const wards = ["ICU", "Cardiology", "Pulmonology", "General", "Emergency"];

export function TransferDialog({
  patient,
  open,
  onClose,
}: {
  patient: Patient;
  open: boolean;
  onClose: () => void;
}) {
  const [ward, setWard] = useState(patient.ward);
  const [bed, setBed] = useState(patient.bed);

  const unchanged = ward === patient.ward && bed.trim() === patient.bed;
  const valid = bed.trim().length > 0 && !unchanged;

  const submit = () => {
    if (!valid) return;
    transferPatient(patient.id, ward, bed.trim());
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Transfer Patient"
      description={`${patient.name} · ${patient.id}`}
    >
      <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3 text-sm">
        <span className="text-muted-foreground">
          {patient.ward} · Bed {patient.bed}
        </span>
        <ArrowRight className="size-4 text-primary" />
        <span className="font-medium">
          {ward} · Bed {bed.trim() || "—"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
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

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!valid}>
          Confirm transfer
        </Button>
      </div>
    </Dialog>
  );
}

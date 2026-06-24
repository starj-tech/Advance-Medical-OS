"use client";

import { useState } from "react";
import { Pill } from "lucide-react";
import { dispenseToPatient, useFormulary } from "@/lib/store";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

export function DispenseDialog({
  patientId,
  patientName,
  open,
  onClose,
}: {
  patientId: string;
  patientName: string;
  open: boolean;
  onClose: () => void;
}) {
  const formulary = useFormulary();
  const [medId, setMedId] = useState<number>(formulary[0]?.id ?? 1);
  const [qty, setQty] = useState(1);

  const med = formulary.find((f) => f.id === medId);
  const insufficient = !!med && qty > med.stockQuantity;

  const submit = () => {
    if (!med || insufficient || qty < 1) return;
    dispenseToPatient(patientId, medId, qty);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Dispense Medication"
      description={`${patientName} · ${patientId}`}
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Medication
          </span>
          <select
            value={medId}
            onChange={(e) => setMedId(Number(e.target.value))}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            {formulary.map((f) => (
              <option key={f.id} value={f.id}>
                {f.medicationName} {f.dosage} — {formatNumber(f.stockQuantity)} in
                stock
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Quantity
          </span>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            className="h-10 w-32 rounded-lg border border-border bg-background px-3 text-sm tabular-nums outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </label>

        {med && (
          <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3 text-sm">
            <Pill className="size-4 text-primary" />
            <span className="flex-1">
              After dispensing:{" "}
              <span className="font-medium tabular-nums">
                {formatNumber(Math.max(0, med.stockQuantity - qty))}
              </span>{" "}
              remaining
            </span>
            {insufficient && <Badge variant="danger">Insufficient stock</Badge>}
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={insufficient || qty < 1}>
          Dispense
        </Button>
      </div>
    </Dialog>
  );
}

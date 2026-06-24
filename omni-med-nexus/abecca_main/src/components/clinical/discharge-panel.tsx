"use client";

import { useCallback, useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import type { DischargeCondition, DischargeSummary } from "@/server/clinical/discharge";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const CONDITION: { value: DischargeCondition; label: string }[] = [
  { value: "membaik", label: "Membaik" },
  { value: "sembuh", label: "Sembuh" },
  { value: "dirujuk", label: "Dirujuk" },
  { value: "pulang_paksa", label: "Pulang Paksa (APS)" },
  { value: "meninggal", label: "Meninggal" },
];
const CONDITION_LABEL = Object.fromEntries(CONDITION.map((c) => [c.value, c.label])) as Record<DischargeCondition, string>;
const CONDITION_VARIANT: Record<DischargeCondition, "success" | "warning" | "danger"> = {
  membaik: "success", sembuh: "success", dirujuk: "warning", pulang_paksa: "warning", meninggal: "danger",
};

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";
const taCls =
  "min-h-[56px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY = { condition: "membaik" as DischargeCondition, clinicalSummary: "", treatment: "", followUp: "", dischargeMeds: "" };

export function DischargePanel({
  encounterId,
  active,
  onDischarged,
}: {
  encounterId: string;
  active: boolean;
  onDischarged?: () => void;
}) {
  const [summary, setSummary] = useState<DischargeSummary | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/encounters/${encounterId}/discharge`);
    if (res.ok) setSummary(await res.json());
  }, [encounterId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const submit = async () => {
    if (!draft.clinicalSummary.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/encounters/${encounterId}/discharge`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSaving(false);
    if (res.ok) {
      setDraft(EMPTY);
      await load();
      onDischarged?.();
    }
  };

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Resume Medis (Discharge Summary)
      </span>

      {summary ? (
        <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <div className="mb-1 flex items-center gap-2">
            <Badge variant={CONDITION_VARIANT[summary.condition]}>
              {CONDITION_LABEL[summary.condition]}
            </Badge>
            <span className="ml-auto text-xs text-muted-foreground">{formatDate(summary.createdAt)}</span>
          </div>
          <p><span className="font-semibold">Ringkasan:</span> {summary.clinicalSummary}</p>
          {summary.treatment && <p><span className="font-semibold">Terapi:</span> {summary.treatment}</p>}
          {summary.followUp && <p><span className="font-semibold">Tindak lanjut:</span> {summary.followUp}</p>}
          {summary.dischargeMeds && <p><span className="font-semibold">Obat pulang:</span> {summary.dischargeMeds}</p>}
        </div>
      ) : active ? (
        <Can permission="discharge:write">
          <div className="space-y-2">
            <select
              className={inputCls}
              value={draft.condition}
              onChange={(e) => setDraft((d) => ({ ...d, condition: e.target.value as DischargeCondition }))}
              aria-label="Kondisi pulang"
            >
              {CONDITION.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <textarea
              className={taCls}
              value={draft.clinicalSummary}
              onChange={(e) => setDraft((d) => ({ ...d, clinicalSummary: e.target.value }))}
              placeholder="Ringkasan klinis *"
              aria-label="Ringkasan klinis"
            />
            <textarea
              className={taCls}
              value={draft.treatment}
              onChange={(e) => setDraft((d) => ({ ...d, treatment: e.target.value }))}
              placeholder="Terapi yang diberikan"
              aria-label="Terapi"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <textarea
                className={taCls}
                value={draft.followUp}
                onChange={(e) => setDraft((d) => ({ ...d, followUp: e.target.value }))}
                placeholder="Rencana tindak lanjut / kontrol"
                aria-label="Tindak lanjut"
              />
              <textarea
                className={taCls}
                value={draft.dischargeMeds}
                onChange={(e) => setDraft((d) => ({ ...d, dischargeMeds: e.target.value }))}
                placeholder="Obat pulang"
                aria-label="Obat pulang"
              />
            </div>
            <Button size="sm" onClick={submit} disabled={saving || !draft.clinicalSummary.trim()}>
              <LogOut className="size-4" /> Pulangkan & Tutup Kunjungan
            </Button>
          </div>
        </Can>
      ) : (
        <p className="text-xs text-muted-foreground">Belum ada resume medis.</p>
      )}
    </div>
  );
}

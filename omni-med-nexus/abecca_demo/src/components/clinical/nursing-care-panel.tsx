"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Stethoscope } from "lucide-react";
import type { NursingCare } from "@/server/clinical/nursing-care";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const taCls =
  "min-h-[48px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY = { nursingDiagnosis: "", goal: "", intervention: "", evaluation: "" };

export function NursingCarePanel({ encounterId, active }: { encounterId: string; active: boolean }) {
  const [entries, setEntries] = useState<NursingCare[]>([]);
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/encounters/${encounterId}/nursing-care`);
    if (res.ok) setEntries(await res.json());
  }, [encounterId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const submit = async () => {
    if (!draft.nursingDiagnosis.trim() || !draft.goal.trim() || !draft.intervention.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/encounters/${encounterId}/nursing-care`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSaving(false);
    if (res.ok) {
      setDraft(EMPTY);
      await load();
    }
  };

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Stethoscope className="size-3.5" /> Asuhan Keperawatan (SDKI/SLKI/SIKI)
      </span>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">Belum ada asuhan keperawatan.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((c) => (
            <li key={c.id} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold">{c.nursingDiagnosis}</span>
                <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
              </div>
              <p><span className="font-semibold">Tujuan:</span> {c.goal}</p>
              <p><span className="font-semibold">Intervensi:</span> {c.intervention}</p>
              {c.evaluation && <p><span className="font-semibold">Evaluasi:</span> {c.evaluation}</p>}
            </li>
          ))}
        </ul>
      )}

      {active && (
        <Can permission="nursing:write">
          <div className="space-y-2">
            <textarea className={taCls} value={draft.nursingDiagnosis}
              onChange={(e) => setDraft((d) => ({ ...d, nursingDiagnosis: e.target.value }))}
              placeholder="Diagnosis keperawatan (SDKI) *" aria-label="Diagnosis keperawatan" />
            <div className="grid gap-2 sm:grid-cols-2">
              <textarea className={taCls} value={draft.goal}
                onChange={(e) => setDraft((d) => ({ ...d, goal: e.target.value }))}
                placeholder="Tujuan / luaran (SLKI) *" aria-label="Tujuan keperawatan" />
              <textarea className={taCls} value={draft.intervention}
                onChange={(e) => setDraft((d) => ({ ...d, intervention: e.target.value }))}
                placeholder="Intervensi (SIKI) *" aria-label="Intervensi keperawatan" />
            </div>
            <textarea className={taCls} value={draft.evaluation}
              onChange={(e) => setDraft((d) => ({ ...d, evaluation: e.target.value }))}
              placeholder="Evaluasi (opsional)" aria-label="Evaluasi keperawatan" />
            <Button size="sm" onClick={submit}
              disabled={saving || !draft.nursingDiagnosis.trim() || !draft.goal.trim() || !draft.intervention.trim()}>
              <Plus className="size-4" /> Tambah Asuhan
            </Button>
          </div>
        </Can>
      )}
    </div>
  );
}

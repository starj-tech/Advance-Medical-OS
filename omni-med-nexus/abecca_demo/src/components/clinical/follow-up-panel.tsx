"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarHeart, Plus } from "lucide-react";
import type { FollowUp, FollowUpStatus } from "@/server/clinical/follow-ups";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const STATUS_LABEL: Record<FollowUpStatus, string> = {
  scheduled: "Terjadwal", sent: "Terkirim", cancelled: "Batal",
};
const STATUS_VARIANT: Record<FollowUpStatus, "info" | "success" | "danger"> = {
  scheduled: "info", sent: "success", cancelled: "danger",
};

const EMPTY = { dueDate: "", reason: "", patientPhone: "" };

export function FollowUpPanel({ encounterId, active }: { encounterId: string; active: boolean }) {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/encounters/${encounterId}/follow-ups`);
    if (res.ok) setItems(await res.json());
  }, [encounterId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const submit = async () => {
    if (!draft.dueDate || !draft.reason.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/encounters/${encounterId}/follow-ups`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        dueDate: draft.dueDate,
        reason: draft.reason.trim(),
        patientPhone: draft.patientPhone.trim() || null,
      }),
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
        <CalendarHeart className="size-3.5" /> Kontrol Ulang
      </span>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Belum ada jadwal kontrol ulang.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((f) => (
            <li key={f.id} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <div className="mb-0.5 flex flex-wrap items-center gap-2">
                <span className="font-medium">{formatDate(f.dueDate)}</span>
                <Badge variant={STATUS_VARIANT[f.status]}>{STATUS_LABEL[f.status]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {f.reason}{f.patientPhone ? ` · WA ${f.patientPhone}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      {active && (
        <Can permission="note:write">
          <div className="grid gap-2 sm:grid-cols-2">
            <input className={inputCls} type="date" value={draft.dueDate}
              onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
              aria-label="Tanggal kontrol ulang" />
            <input className={inputCls} value={draft.patientPhone}
              onChange={(e) => setDraft((d) => ({ ...d, patientPhone: e.target.value }))}
              placeholder="No. WA pasien (opsional)" aria-label="No. WA pasien" />
            <input className={`${inputCls} sm:col-span-2`} value={draft.reason}
              onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
              placeholder="Alasan / instruksi kontrol *" aria-label="Alasan kontrol" />
            <div className="sm:col-span-2">
              <Button size="sm" onClick={submit} disabled={saving || !draft.dueDate || !draft.reason.trim()}>
                <Plus className="size-4" /> Jadwalkan Kontrol Ulang
              </Button>
            </div>
          </div>
        </Can>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";
import type { Referral, ReferralUrgency } from "@/server/clinical/referrals";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const URGENCY: { value: ReferralUrgency; label: string }[] = [
  { value: "rutin", label: "Rutin" },
  { value: "segera", label: "Segera" },
  { value: "emergensi", label: "Emergensi" },
];
const URGENCY_LABEL = Object.fromEntries(URGENCY.map((u) => [u.value, u.label])) as Record<ReferralUrgency, string>;
const URGENCY_VARIANT: Record<ReferralUrgency, "muted" | "warning" | "danger"> = {
  rutin: "muted", segera: "warning", emergensi: "danger",
};

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";
const taCls =
  "min-h-[48px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY = { destinationFacility: "", reason: "", urgency: "rutin" as ReferralUrgency, notes: "" };

export function ReferralPanel({ encounterId, active }: { encounterId: string; active: boolean }) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/encounters/${encounterId}/referrals`);
    if (res.ok) setReferrals(await res.json());
  }, [encounterId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const submit = async () => {
    if (!draft.destinationFacility.trim() || !draft.reason.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/encounters/${encounterId}/referrals`, {
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
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Rujukan
      </span>
      {referrals.length === 0 ? (
        <p className="text-xs text-muted-foreground">Belum ada rujukan.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {referrals.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <div className="mb-1 flex items-center gap-2">
                <Badge variant={URGENCY_VARIANT[r.urgency]}>{URGENCY_LABEL[r.urgency]}</Badge>
                <span className="font-medium">{r.destinationFacility}</span>
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
              </div>
              <p><span className="font-semibold">Alasan:</span> {r.reason}</p>
              {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
            </li>
          ))}
        </ul>
      )}

      {active && (
        <Can permission="referral:write">
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className={inputCls}
                value={draft.destinationFacility}
                onChange={(e) => setDraft((d) => ({ ...d, destinationFacility: e.target.value }))}
                placeholder="Faskes tujuan *"
                aria-label="Faskes tujuan"
              />
              <select
                className={inputCls}
                value={draft.urgency}
                onChange={(e) => setDraft((d) => ({ ...d, urgency: e.target.value as ReferralUrgency }))}
                aria-label="Urgensi"
              >
                {URGENCY.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <textarea
              className={taCls}
              value={draft.reason}
              onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
              placeholder="Alasan rujukan *"
              aria-label="Alasan rujukan"
            />
            <textarea
              className={taCls}
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Catatan (opsional)"
              aria-label="Catatan rujukan"
            />
            <Button
              size="sm"
              onClick={submit}
              disabled={saving || !draft.destinationFacility.trim() || !draft.reason.trim()}
            >
              <Send className="size-4" /> Buat Rujukan
            </Button>
          </div>
        </Can>
      )}
    </div>
  );
}

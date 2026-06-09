"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity } from "lucide-react";
import type { Observation } from "@/server/clinical/observations";
import { type Consciousness, scoreNews2 } from "@/lib/ews";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const BAND_VARIANT = { high: "danger", medium: "warning", low: "success" } as const;
const BAND_LABEL = { high: "Tinggi", medium: "Sedang", low: "Rendah" } as const;

const ACVPU: { value: Consciousness; label: string }[] = [
  { value: "alert", label: "Sadar (A)" },
  { value: "confusion", label: "Bingung (C)" },
  { value: "voice", label: "Suara (V)" },
  { value: "pain", label: "Nyeri (P)" },
  { value: "unresponsive", label: "Tidak respons (U)" },
];

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY = {
  respiratoryRate: "", spo2: "", temperature: "", systolicBp: "", pulse: "",
  consciousness: "alert" as Consciousness, onOxygen: false,
};

export function VitalsPanel({ encounterId, active }: { encounterId: string; active: boolean }) {
  const [obs, setObs] = useState<Observation[]>([]);
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/encounters/${encounterId}/observations`);
    if (res.ok) setObs(await res.json());
  }, [encounterId]);
  useEffect(() => {
    // Async load: state is set after `await`, so the set-state-in-effect rule is a false positive.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Live NEWS2 preview once the five numeric vitals are present.
  const vals = [draft.respiratoryRate, draft.spo2, draft.temperature, draft.systolicBp, draft.pulse];
  const complete = vals.every((v) => v.trim() !== "" && Number.isFinite(Number(v)));
  const preview = complete
    ? scoreNews2({
        respiratoryRate: Number(draft.respiratoryRate),
        spo2: Number(draft.spo2),
        onOxygen: draft.onOxygen,
        temperature: Number(draft.temperature),
        systolicBp: Number(draft.systolicBp),
        pulse: Number(draft.pulse),
        consciousness: draft.consciousness,
      })
    : null;

  const submit = async () => {
    if (!preview) return;
    setSaving(true);
    const res = await fetch(`/api/encounters/${encounterId}/observations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        respiratoryRate: Number(draft.respiratoryRate),
        spo2: Number(draft.spo2),
        onOxygen: draft.onOxygen,
        temperature: Number(draft.temperature),
        systolicBp: Number(draft.systolicBp),
        pulse: Number(draft.pulse),
        consciousness: draft.consciousness,
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
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Observasi & EWS (NEWS2)
      </span>
      {obs.length === 0 ? (
        <p className="text-xs text-muted-foreground">Belum ada observasi.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {obs.map((o) => (
            <li key={o.id} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <div className="mb-1 flex items-center gap-2">
                <Badge variant={BAND_VARIANT[o.ewsBand]}>
                  EWS {o.ewsScore} · {BAND_LABEL[o.ewsBand]}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(o.recordedAt)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                RR {o.respiratoryRate} · SpO₂ {o.spo2}%{o.onOxygen ? " (O₂)" : ""} · T {o.temperature}° ·
                {" "}Sis {o.systolicBp} · Nadi {o.pulse} · {o.consciousness.charAt(0).toUpperCase()}
              </p>
            </li>
          ))}
        </ul>
      )}

      {active && (
        <Can permission="vitals:record">
          <div className="grid gap-2 sm:grid-cols-3">
            <input className={inputCls} inputMode="numeric" placeholder="Napas /mnt"
              value={draft.respiratoryRate}
              onChange={(e) => setDraft((d) => ({ ...d, respiratoryRate: e.target.value }))}
              aria-label="Frekuensi napas" />
            <input className={inputCls} inputMode="numeric" placeholder="SpO₂ %"
              value={draft.spo2}
              onChange={(e) => setDraft((d) => ({ ...d, spo2: e.target.value }))}
              aria-label="SpO2" />
            <input className={inputCls} inputMode="decimal" placeholder="Suhu °C"
              value={draft.temperature}
              onChange={(e) => setDraft((d) => ({ ...d, temperature: e.target.value }))}
              aria-label="Suhu" />
            <input className={inputCls} inputMode="numeric" placeholder="Sistolik mmHg"
              value={draft.systolicBp}
              onChange={(e) => setDraft((d) => ({ ...d, systolicBp: e.target.value }))}
              aria-label="Tekanan sistolik" />
            <input className={inputCls} inputMode="numeric" placeholder="Nadi /mnt"
              value={draft.pulse}
              onChange={(e) => setDraft((d) => ({ ...d, pulse: e.target.value }))}
              aria-label="Nadi" />
            <select className={inputCls} value={draft.consciousness}
              onChange={(e) => setDraft((d) => ({ ...d, consciousness: e.target.value as Consciousness }))}
              aria-label="Kesadaran">
              {ACVPU.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={draft.onOxygen}
              onChange={(e) => setDraft((d) => ({ ...d, onOxygen: e.target.checked }))} />
            Mendapat suplementasi oksigen
          </label>
          <div className="flex items-center gap-2">
            {preview && (
              <Badge variant={BAND_VARIANT[preview.band]}>
                Pratinjau EWS {preview.score} · {BAND_LABEL[preview.band]}
              </Badge>
            )}
            <Button size="sm" className="ml-auto" onClick={submit} disabled={!preview || saving}>
              <Activity className="size-4" /> Catat Observasi
            </Button>
          </div>
        </Can>
      )}
    </div>
  );
}

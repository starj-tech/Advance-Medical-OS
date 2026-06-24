"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Clock, Siren, Stethoscope, UserPlus } from "lucide-react";
import type { EdMetrics, EdVisit } from "@/server/ed/triage";
import { computeEsi, ESI_LABEL, ESI_VARIANT, type EsiLevel } from "@/lib/esi";
import { ED_DISPOSITIONS, ED_DISPOSITION_LABEL, ED_STATUS_LABEL } from "@/lib/ed";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY = { patientId: "", complaint: "", lifeSaving: false, highRisk: false, resources: 0, dangerVitals: false };

function minutesSince(iso: string): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return m < 60 ? `${m} mnt` : `${Math.floor(m / 60)} j ${m % 60} mnt`;
}

export function EmergencyView() {
  const [visits, setVisits] = useState<EdVisit[]>([]);
  const [metrics, setMetrics] = useState<EdMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/ed/visits?active=1");
    if (res.ok) {
      const j = await res.json();
      setVisits(j.visits);
      setMetrics(j.metrics);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const preview = computeEsi(draft);

  const triage = async () => {
    if (!draft.patientId.trim() || !draft.complaint.trim()) return;
    setBusy(true);
    const res = await fetch("/api/ed/visits", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft),
    });
    setBusy(false);
    if (res.ok) { setDraft(EMPTY); await load(); }
  };

  const advance = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/ed/visits/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) await load();
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">IGD — Triase & Papan Lacak</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Triase Emergency Severity Index (ESI 1–5). Papan diurutkan berdasarkan keakutan lalu waktu datang.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <Clock className="size-4 text-primary" />
          <p className="mt-3 text-2xl font-semibold tabular-nums">{metrics?.waiting ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Menunggu dokter</p>
        </Card>
        <Card className="p-4">
          <Stethoscope className="size-4 text-primary" />
          <p className="mt-3 text-2xl font-semibold tabular-nums">{metrics?.inTreatment ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Dalam penanganan</p>
        </Card>
        <Card className="p-4">
          <Activity className="size-4 text-primary" />
          <p className="mt-3 text-2xl font-semibold tabular-nums">
            {metrics?.avgDoorToDoctorMin != null ? `${metrics.avgDoorToDoctorMin}′` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Rata² door-to-doctor</p>
        </Card>
        <Card className="p-4">
          <Siren className="size-4 text-primary" />
          <div className="mt-3 flex flex-wrap gap-1">
            {([1, 2, 3, 4, 5] as EsiLevel[]).map((l) => (
              <Badge key={l} variant={ESI_VARIANT[l]} title={ESI_LABEL[l]}>
                {l}:{metrics?.byLevel[l] ?? 0}
              </Badge>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Aktif per level ESI</p>
        </Card>
      </section>

      <Can permission="registration:write">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-4 text-primary" /> Triase Pasien Baru
            </CardTitle>
            <Badge variant={ESI_VARIANT[preview.level]}>
              ESI {preview.level} · {ESI_LABEL[preview.level]}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input className={inputCls} value={draft.patientId} placeholder="No. RM / pasien *"
                onChange={(e) => setDraft((d) => ({ ...d, patientId: e.target.value }))} aria-label="ID pasien" />
              <input className={inputCls} value={draft.complaint} placeholder="Keluhan utama *"
                onChange={(e) => setDraft((d) => ({ ...d, complaint: e.target.value }))} aria-label="Keluhan" />
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.lifeSaving}
                  onChange={(e) => setDraft((d) => ({ ...d, lifeSaving: e.target.checked }))} />
                Butuh intervensi penyelamatan jiwa segera (ESI 1)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.highRisk}
                  onChange={(e) => setDraft((d) => ({ ...d, highRisk: e.target.checked }))} />
                Risiko tinggi / penurunan kesadaran / nyeri berat (ESI 2)
              </label>
              <label className="flex flex-wrap items-center gap-2">
                Perkiraan jumlah sumber daya:
                <input type="number" min={0} max={9} value={draft.resources}
                  onChange={(e) => setDraft((d) => ({ ...d, resources: Number(e.target.value) || 0 }))}
                  className="h-8 w-16 rounded-lg border border-border bg-background px-2 text-sm" aria-label="Jumlah sumber daya" />
                <span className="text-xs text-muted-foreground">(0 → ESI 5, 1 → ESI 4, ≥2 → ESI 3)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.dangerVitals}
                  onChange={(e) => setDraft((d) => ({ ...d, dangerVitals: e.target.checked }))} />
                Tanda vital zona bahaya (naikkan ESI 3 → 2)
              </label>
            </div>
            <p className="text-xs text-muted-foreground">{preview.rationale}</p>
            <div>
              <Button onClick={triage} disabled={busy || !draft.patientId.trim() || !draft.complaint.trim()}>
                <Siren className="size-4" /> Triase (ESI {preview.level})
              </Button>
            </div>
          </CardContent>
        </Card>
      </Can>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Siren className="size-4 text-primary" /> Papan Lacak IGD
          </CardTitle>
          <Badge variant={visits.length ? "warning" : "success"}>{visits.length} aktif</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Memuat…</p>
          ) : visits.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Tidak ada pasien aktif di IGD.</p>
          ) : (
            <ul className="divide-y divide-border">
              {visits.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <Badge variant={ESI_VARIANT[v.esiLevel]} title={v.esiRationale}>
                    ESI {v.esiLevel}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{v.patientId}</span>
                      <span className="text-sm text-muted-foreground">· {v.complaint}</span>
                      <Badge variant="muted">{ED_STATUS_LABEL[v.status]}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Datang {formatDateTime(v.arrivalAt)} · menunggu {minutesSince(v.arrivalAt)}
                      {v.doctorSeenAt ? " · sudah dilihat dokter" : ""}
                    </p>
                  </div>
                  <Can permission="encounter:write">
                    <span className="flex flex-wrap gap-1.5">
                      {!v.doctorSeenAt && (
                        <Button size="sm" variant="outline" onClick={() => advance(v.id, { action: "seen" })}>
                          Dilihat dokter
                        </Button>
                      )}
                      {ED_DISPOSITIONS.map((d) => (
                        <Button key={d} size="sm" variant="ghost"
                          onClick={() => advance(v.id, { action: "disposition", disposition: d })}>
                          {ED_DISPOSITION_LABEL[d]}
                        </Button>
                      ))}
                    </span>
                  </Can>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BedDouble,
  Building2,
  ClipboardList,
  Lock,
  ShieldAlert,
  Stethoscope,
  Wallet,
} from "lucide-react";
import type { AnalyticsOverview } from "@/server/analytics/overview";
import type { EncounterType } from "@/server/clinical/encounters";
import type { Grading, IncidentType } from "@/server/safety/ikp";
import { formatIDR, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Can } from "@/components/auth/can";

const ENC_LABEL: Record<EncounterType, string> = {
  outpatient: "Rawat Jalan",
  inpatient: "Rawat Inap",
  ed: "IGD",
  odc: "ODC / One-Day Care",
};

const INC_LABEL: Record<IncidentType, string> = {
  KPC: "KPC",
  KNC: "KNC",
  KTC: "KTC",
  KTD: "KTD",
  sentinel: "Sentinel",
};

const GRADING_BAR: Record<Grading, string> = {
  biru: "bg-sky-500",
  hijau: "bg-emerald-500",
  kuning: "bg-amber-500",
  merah: "bg-rose-500",
};

/** BOR bands follow Depkes RI: 60–85% ideal, below under-used, above crowded. */
function borTone(bor: number): "default" | "success" | "warning" {
  if (bor >= 60 && bor <= 85) return "success";
  if (bor > 85) return "warning";
  return "default";
}

function Bar({ pct, className = "bg-primary" }: { pct: number; className?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export function AnalyticsView() {
  return (
    <Can
      permission="analytics:read"
      fallback={
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Lock className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">Akses terbatas</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Analitik eksekutif hanya tersedia untuk tier eksekutif dan manajer.
            </p>
          </CardContent>
        </Card>
      }
    >
      <AnalyticsDashboard />
    </Can>
  );
}

function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/analytics/overview");
    const next: AnalyticsOverview | null = res.ok ? await res.json() : null;
    setData(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Async load; state set after await (false positive for the rule).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (loading) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Memuat analitik…</p>;
  }
  if (!data) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Data analitik tidak tersedia.</p>;
  }

  const { encounters, occupancy, topDiagnoses, revenue, safety } = data;
  const maxDx = Math.max(1, ...topDiagnoses.map((d) => d.count));

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Kunjungan Aktif"
          value={encounters.active}
          icon={Activity}
          hint={`${encounters.total} total kunjungan`}
        />
        <StatCard
          label="BOR Keseluruhan"
          value={`${occupancy.bor}%`}
          icon={BedDouble}
          tone={borTone(occupancy.bor)}
          hint={`${occupancy.occupied}/${occupancy.totalBeds} bed terisi`}
        />
        <StatCard
          label="Pendapatan Tercatat"
          value={formatIDR(revenue.totalCharges)}
          icon={Wallet}
          tone="success"
          hint={`Terbayar ${revenue.collectionRate}%`}
        />
        <StatCard
          label="Insiden Terbuka"
          value={safety.open}
          icon={ShieldAlert}
          tone={safety.open > 0 ? "warning" : "default"}
          hint={`${safety.total} total insiden`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Encounter mix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="size-4 text-primary" /> Bauran Kunjungan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {encounters.total === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Belum ada kunjungan.</p>
            ) : (
              (Object.keys(ENC_LABEL) as EncounterType[]).map((t) => {
                const n = encounters.byType[t];
                const pct = encounters.total ? (n / encounters.total) * 100 : 0;
                return (
                  <div key={t} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{ENC_LABEL[t]}</span>
                      <span className="font-semibold tabular-nums">
                        {n}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          {Math.round(pct)}%
                        </span>
                      </span>
                    </div>
                    <Bar pct={pct} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Per-ward occupancy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" /> Okupansi per Ruang
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {occupancy.wards.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Belum ada ruang/bed terdaftar.</p>
            ) : (
              occupancy.wards.map((w) => (
                <div key={w.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="min-w-0 truncate">{w.name}</span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {w.occupied}/{w.total}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">{w.bor}%</span>
                    </span>
                  </div>
                  <Bar
                    pct={w.bor}
                    className={
                      w.bor > 85 ? "bg-amber-500" : w.bor >= 60 ? "bg-emerald-500" : "bg-primary"
                    }
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top diagnoses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" /> 10 Diagnosis Terbanyak (ICD-10)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {topDiagnoses.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada diagnosis tercatat.</p>
          ) : (
            <ul className="divide-y divide-border">
              {topDiagnoses.map((d, i) => (
                <li key={d.code} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <Badge variant="muted" className="shrink-0 font-mono">{d.code}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{d.description}</p>
                    <div className="mt-1">
                      <Bar pct={(d.count / maxDx) * 100} />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{d.count}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue detail */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4 text-primary" /> Pendapatan &amp; Piutang
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total tagihan</span>
              <span className="font-semibold tabular-nums">{formatIDR(revenue.totalCharges)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Terbayar</span>
              <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatIDR(revenue.totalPaid)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Piutang (outstanding)</span>
              <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                {formatIDR(revenue.outstanding)}
              </span>
            </div>
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Tingkat penagihan</span>
                <span className="tabular-nums">{revenue.collectionRate}%</span>
              </div>
              <Bar pct={revenue.collectionRate} className="bg-emerald-500" />
            </div>
          </CardContent>
        </Card>

        {/* Patient safety */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-primary" /> Keselamatan Pasien
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(INC_LABEL) as IncidentType[]).map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs"
                >
                  {INC_LABEL[t]}
                  <span className="font-semibold tabular-nums">{safety.byType[t]}</span>
                </span>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Grading risiko
              </p>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(GRADING_BAR) as Grading[]).map((gr) => (
                  <div key={gr} className="rounded-lg border border-border p-2 text-center">
                    <span className={`mx-auto mb-1 block size-2.5 rounded-full ${GRADING_BAR[gr]}`} />
                    <p className="text-lg font-semibold tabular-nums">{safety.byGrading[gr]}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{gr}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {safety.open} dari {safety.total} insiden masih dalam proses.
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Agregat real-time dari data transaksi · {formatNumber(encounters.total)} kunjungan ·{" "}
        diperbarui {new Date(data.generatedAt).toLocaleTimeString("id-ID")}
      </p>
    </div>
  );
}

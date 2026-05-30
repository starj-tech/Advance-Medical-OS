import Link from "next/link";
import {
  ChevronRight,
  Link2,
  Pill,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import {
  getAuditChain,
  getFormulary,
  getOverview,
  getPatients,
} from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { AcuityBadge } from "@/components/ui/acuity-badge";
import { EwsGauge } from "@/components/ui/ews-gauge";
import {
  acuityMeta,
  cn,
  formatNumber,
  shortHash,
  timeAgo,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [overview, patients, formulary, chain] = await Promise.all([
    getOverview(),
    getPatients(),
    getFormulary(),
    getAuditChain(),
  ]);

  const watchlist = [...patients]
    .sort((a, b) => b.vitals.ews - a.vitals.ews)
    .slice(0, 4);
  const lowStock = formulary.filter((f) => f.stockQuantity <= f.reorderLevel);
  const recentAudit = [...chain].reverse().slice(0, 5);

  const acuityCounts = {
    critical: overview.critical,
    guarded: overview.guarded,
    stable: overview.stable,
  };
  const total = overview.totalPatients || 1;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Stat row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Patients"
          value={overview.totalPatients}
          icon={Users}
          hint={`Across ${overview.wards} wards`}
        />
        <StatCard
          label="Critical (EWS ≥ 7)"
          value={overview.critical}
          icon={TriangleAlert}
          tone="danger"
          hint="Needs immediate review"
        />
        <StatCard
          label="Low-stock Meds"
          value={overview.lowStockItems}
          icon={Pill}
          tone="warning"
          hint="At or below reorder level"
        />
        <StatCard
          label="Audit Blocks"
          value={overview.auditBlocks}
          icon={ShieldCheck}
          tone="success"
          hint={overview.chainValid ? "Chain verified" : "Chain broken"}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Watchlist */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Critical Watchlist</CardTitle>
            <Link
              href="/patients"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              All patients <ChevronRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {watchlist.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/patients/${p.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-foreground/[0.02]"
                  >
                    <EwsGauge score={p.vitals.ews} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {p.name}
                        </span>
                        <AcuityBadge level={p.acuity} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {p.id} · {p.ward} · Bed {p.bed} · {p.age}y
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-xs text-muted-foreground">HR / SpO₂</p>
                      <p className="text-sm font-medium tabular-nums">
                        {p.vitals.heartRate} · {p.vitals.spo2}%
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Acuity mix */}
        <Card>
          <CardHeader>
            <CardTitle>Acuity Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex h-3 overflow-hidden rounded-full">
              {(["critical", "guarded", "stable"] as const).map((k) =>
                acuityCounts[k] > 0 ? (
                  <div
                    key={k}
                    className={acuityMeta[k].dot}
                    style={{ width: `${(acuityCounts[k] / total) * 100}%` }}
                  />
                ) : null,
              )}
            </div>
            <ul className="flex flex-col gap-3">
              {(["critical", "guarded", "stable"] as const).map((k) => (
                <li key={k} className="flex items-center gap-3">
                  <span
                    className={cn("size-2.5 rounded-full", acuityMeta[k].dot)}
                  />
                  <span className="text-sm capitalize">{acuityMeta[k].label}</span>
                  <span className="ml-auto text-sm font-semibold tabular-nums">
                    {acuityCounts[k]}
                  </span>
                  <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                    {Math.round((acuityCounts[k] / total) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Low stock */}
        <Card>
          <CardHeader>
            <CardTitle>Pharmacy Alerts</CardTitle>
            <Link
              href="/formulary"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Formulary <ChevronRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All medications above reorder level.
              </p>
            ) : (
              lowStock.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Pill className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {m.medicationName}{" "}
                      <span className="text-muted-foreground">{m.dosage}</span>
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatNumber(m.stockQuantity)} in stock · reorder at{" "}
                      {formatNumber(m.reorderLevel)}
                    </p>
                  </div>
                  <Badge variant="warning" className="ml-auto">
                    Low
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Audit feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Audit Trail
              <Badge variant={overview.chainValid ? "success" : "danger"}>
                <ShieldCheck className="size-3" />
                {overview.chainValid ? "Verified" : "Broken"}
              </Badge>
            </CardTitle>
            <Link
              href="/audit"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Full ledger <ChevronRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {recentAudit.map((b) => (
                <li
                  key={b.hash}
                  className="flex items-center gap-3 px-5 py-3 text-sm"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Link2 className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">
                      <span className="font-medium">
                        {b.action.replaceAll("_", " ").toLowerCase()}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        · {b.patientId} · {b.doctorId}
                      </span>
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      #{b.index} · {shortHash(b.hash)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(b.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

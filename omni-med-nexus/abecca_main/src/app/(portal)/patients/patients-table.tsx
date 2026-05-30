"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, UserPlus } from "lucide-react";
import type { AcuityLevel } from "@/lib/types";
import { usePatients } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AcuityBadge } from "@/components/ui/acuity-badge";
import { AdmitPatientDialog } from "@/components/clinical/admit-patient-dialog";
import { cn, formatDate, initials } from "@/lib/utils";

const filters: { key: AcuityLevel | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "guarded", label: "Guarded" },
  { key: "stable", label: "Stable" },
];

export function PatientsTable() {
  const patients = usePatients();
  const [query, setQuery] = useState("");
  const [acuity, setAcuity] = useState<AcuityLevel | "all">("all");
  const [showDischarged, setShowDischarged] = useState(false);
  const [admitOpen, setAdmitOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients
      .filter((p) => (showDischarged ? true : !p.dischargedAt))
      .filter((p) => (acuity === "all" ? true : p.acuity === acuity))
      .filter((p) =>
        q === ""
          ? true
          : p.name.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q) ||
            p.ward.toLowerCase().includes(q) ||
            p.diagnoses.some(
              (d) =>
                d.code.toLowerCase().includes(q) ||
                d.description.toLowerCase().includes(q),
            ),
      )
      .sort((a, b) => b.vitals.ews - a.vitals.ews);
  }, [patients, query, acuity, showDischarged]);

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ID, ward or ICD-10…"
            aria-label="Search patients"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setAcuity(f.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                acuity === f.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button onClick={() => setAdmitOpen(true)} className="shrink-0">
          <UserPlus className="size-4" />
          Admit
        </Button>
      </div>

      {/* Table (desktop) */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Patient</th>
              <th className="px-5 py-3 font-medium">Location</th>
              <th className="px-5 py-3 font-medium">Diagnoses</th>
              <th className="px-5 py-3 text-center font-medium">EWS</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Admitted</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((p) => (
              <tr
                key={p.id}
                className="group transition-colors hover:bg-foreground/[0.02]"
              >
                <td className="px-5 py-3">
                  <Link href={`/patients/${p.id}`} className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(p.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-medium">
                        {p.name}
                        {p.dischargedAt && (
                          <Badge variant="muted">Discharged</Badge>
                        )}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {p.id} · {p.age}y · {p.sex === "male" ? "M" : "F"}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <span className="text-sm">{p.ward}</span>
                  <span className="block text-xs text-muted-foreground">
                    Bed {p.bed}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {p.diagnoses.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      p.diagnoses.map((d) => (
                        <Badge key={d.code} variant="muted" title={d.description}>
                          {d.code}
                        </Badge>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-center font-semibold tabular-nums">
                  {p.vitals.ews}
                </td>
                <td className="px-5 py-3">
                  <AcuityBadge level={p.acuity} />
                </td>
                <td className="px-5 py-3 text-sm text-muted-foreground">
                  {formatDate(p.admittedAt)}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/patients/${p.id}`}
                    aria-label={`Open ${p.name}`}
                    className="inline-grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No patients match your filters.
          </p>
        )}
      </div>

      {/* Cards (mobile) */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.map((p) => (
          <Link
            key={p.id}
            href={`/patients/${p.id}`}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials(p.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.id} · {p.ward} · Bed {p.bed}
                </p>
              </div>
              <AcuityBadge level={p.acuity} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>EWS {p.vitals.ews} · HR {p.vitals.heartRate}</span>
              <span>{formatDate(p.admittedAt)}</span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No patients match your filters.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {patients.length} patients
        </p>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showDischarged}
            onChange={(e) => setShowDischarged(e.target.checked)}
            className="size-3.5 rounded border-border accent-primary"
          />
          Show discharged
        </label>
      </div>

      <AdmitPatientDialog open={admitOpen} onClose={() => setAdmitOpen(false)} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Search, Users } from "lucide-react";
import type { Staff } from "@/lib/types";
import { toggleStaffDuty, useStaff } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { cn, initials } from "@/lib/utils";

const roleVariant = {
  Physician: "info",
  Nurse: "success",
  Pharmacist: "warning",
  Technician: "muted",
} as const;

const roles: (Staff["role"] | "all")[] = [
  "all",
  "Physician",
  "Nurse",
  "Pharmacist",
  "Technician",
];

export function StaffView() {
  const staff = useStaff();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Staff["role"] | "all">("all");

  const onDuty = staff.filter((s) => s.onDuty).length;

  const q = query.trim().toLowerCase();
  const filtered = staff
    .filter((s) => (role === "all" ? true : s.role === role))
    .filter((s) =>
      q === ""
        ? true
        : s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q),
    );

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Clinical and operational staff directory. Toggle shift status — the
        dashboard&apos;s on-duty count updates live.
      </p>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Staff" value={staff.length} icon={Users} />
        <StatCard label="On Duty" value={onDuty} icon={Users} tone="success" />
        <StatCard label="Off Duty" value={staff.length - onDuty} icon={Users} />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, ID or department…"
            aria-label="Search staff"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1">
          {roles.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                role === r
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r === "all" ? "All" : r}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <Badge variant="muted">{filtered.length} shown</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {filtered.map((s) => (
              <li key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials(s.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.id} · {s.department}
                  </p>
                </div>
                <Badge variant={roleVariant[s.role]}>{s.role}</Badge>
                <span className="hidden w-20 text-sm text-muted-foreground sm:block">
                  {s.shift}
                </span>
                <button
                  type="button"
                  onClick={() => toggleStaffDuty(s.id)}
                  aria-pressed={s.onDuty}
                  className={cn(
                    "inline-flex w-24 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    s.onDuty
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      s.onDuty ? "bg-emerald-500" : "bg-muted-foreground/40",
                    )}
                  />
                  {s.onDuty ? "On duty" : "Off duty"}
                </button>
              </li>
            ))}
          </ul>
          {filtered.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No staff match your filters.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

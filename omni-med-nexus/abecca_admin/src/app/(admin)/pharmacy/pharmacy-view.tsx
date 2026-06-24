"use client";

import { useState } from "react";
import { Check, Pill, Plus, Search } from "lucide-react";
import { restockMedication, useFormulary } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { cn, formatNumber } from "@/lib/utils";

export function PharmacyView() {
  const formulary = useFormulary();
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const totalUnits = formulary.reduce((s, f) => s + f.stockQuantity, 0);
  const lowStock = formulary.filter((f) => f.stockQuantity <= f.reorderLevel);

  const q = query.trim().toLowerCase();
  const filtered = formulary
    .filter((f) => (lowOnly ? f.stockQuantity <= f.reorderLevel : true))
    .filter((f) =>
      q === ""
        ? true
        : f.medicationName.toLowerCase().includes(q) ||
          f.dosage.toLowerCase().includes(q),
    );

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Formulary inventory and reorder management. Restock to clear low-stock
        alerts — the dashboard updates live.
      </p>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Medications" value={formulary.length} icon={Pill} />
        <StatCard
          label="Units in Stock"
          value={formatNumber(totalUnits)}
          icon={Pill}
          tone="success"
        />
        <StatCard
          label="Below Reorder"
          value={lowStock.length}
          icon={Pill}
          tone={lowStock.length ? "warning" : "success"}
        />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search medication or dosage…"
            aria-label="Search formulary"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          type="button"
          onClick={() => setLowOnly((v) => !v)}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            lowOnly
              ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              : "border-border bg-surface text-muted-foreground hover:text-foreground",
          )}
        >
          {lowOnly && <Check className="size-4" />}
          Low stock only
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
          <Badge variant="muted">{filtered.length} shown</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {filtered.map((m) => {
              const ratio = Math.min(
                m.stockQuantity / Math.max(m.reorderLevel * 3, 1),
                1,
              );
              const low = m.stockQuantity <= m.reorderLevel;
              return (
                <li key={m.id} className="flex items-center gap-4 px-5 py-4">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-lg",
                      low
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    <Pill className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{m.medicationName}</p>
                      <Badge variant="muted">{m.dosage}</Badge>
                      {low && <Badge variant="warning">Reorder</Badge>}
                    </div>
                    <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          low ? "bg-amber-500" : "bg-primary",
                        )}
                        style={{ width: `${Math.max(ratio * 100, 4)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatNumber(m.stockQuantity)}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      reorder {formatNumber(m.reorderLevel)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      variant="outline"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => restockMedication(m.id, 1000)}
                    >
                      <Plus className="size-3.5" />
                      1k
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => restockMedication(m.id, 5000)}
                    >
                      <Plus className="size-3.5" />
                      5k
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          {filtered.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No medications match your filters.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

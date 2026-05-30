import type { Metadata } from "next";
import { Pill } from "lucide-react";
import { getFormulary } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { cn, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Formulary" };

export default async function FormularyPage() {
  const formulary = await getFormulary();
  const totalUnits = formulary.reduce((s, f) => s + f.stockQuantity, 0);
  const lowStock = formulary.filter((f) => f.stockQuantity <= f.reorderLevel);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Hospital pharmacy formulary and live stock levels.
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

      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
          <Badge variant="muted">{formulary.length} items</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {formulary.map((m) => {
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
                    <Pill className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{m.medicationName}</p>
                      <Badge variant="muted">{m.dosage}</Badge>
                      {low && <Badge variant="warning">Low stock</Badge>}
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
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

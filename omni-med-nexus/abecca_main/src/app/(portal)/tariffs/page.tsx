import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import type { Tariff } from "@/lib/types";
import { getTariffs } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatIDR } from "@/lib/utils";

export const metadata: Metadata = { title: "Tariffs" };

const categoryVariant: Record<
  Tariff["category"],
  "info" | "danger" | "warning" | "success"
> = {
  Consultation: "info",
  Emergency: "danger",
  Laboratory: "warning",
  Procedure: "success",
};

export default async function TariffsPage() {
  const tariffs = await getTariffs();
  const grouped = tariffs.reduce<Record<string, Tariff[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});
  const avg =
    tariffs.reduce((s, t) => s + t.basePrice, 0) / Math.max(tariffs.length, 1);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Base procedure tariffs (IDR). These feed billing and cost estimates.
      </p>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Procedures" value={tariffs.length} icon={Receipt} />
        <StatCard
          label="Categories"
          value={Object.keys(grouped).length}
          icon={Receipt}
        />
        <StatCard
          label="Average Tariff"
          value={formatIDR(avg)}
          icon={Receipt}
          tone="success"
        />
      </section>

      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {category}
              <Badge variant={categoryVariant[category as Tariff["category"]]}>
                {items.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {items.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-semibold">
                    {t.procedureCode}
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    {t.procedureName}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatIDR(t.basePrice)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

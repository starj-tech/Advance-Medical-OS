import type { Metadata } from "next";
import { BedDouble } from "lucide-react";
import { getWards } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { cn, occupancyTone } from "@/lib/utils";

export const metadata: Metadata = { title: "Wards & Beds" };

const toneBar = { ok: "bg-emerald-500", warning: "bg-amber-500", danger: "bg-rose-500" };
const toneBadge = { ok: "success", warning: "warning", danger: "danger" } as const;

export default async function WardsPage() {
  const wards = await getWards();
  const totalBeds = wards.reduce((s, w) => s + w.totalBeds, 0);
  const occupied = wards.reduce((s, w) => s + w.occupiedBeds, 0);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Real-time bed capacity across all wards.
      </p>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Beds" value={totalBeds} icon={BedDouble} />
        <StatCard label="Occupied" value={occupied} icon={BedDouble} tone="warning" />
        <StatCard label="Available" value={totalBeds - occupied} icon={BedDouble} tone="success" />
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {wards.map((w) => {
          const rate = w.occupiedBeds / w.totalBeds;
          const tone = occupancyTone(rate);
          const free = w.totalBeds - w.occupiedBeds;
          return (
            <Card key={w.id}>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{w.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.department} · {w.id}
                    </p>
                  </div>
                  <Badge variant={toneBadge[tone]}>
                    {Math.round(rate * 100)}% full
                  </Badge>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", toneBar[tone])}
                    style={{ width: `${rate * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {w.occupiedBeds} occupied
                  </span>
                  <span className="font-medium">{free} available</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

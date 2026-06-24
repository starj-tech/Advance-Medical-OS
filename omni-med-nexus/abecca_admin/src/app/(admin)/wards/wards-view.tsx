"use client";

import { BedDouble, Minus, Plus } from "lucide-react";
import { admitToWard, dischargeFromWard, useWards } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { cn, occupancyTone } from "@/lib/utils";

const toneBar = { ok: "bg-emerald-500", warning: "bg-amber-500", danger: "bg-rose-500" };
const toneBadge = { ok: "success", warning: "warning", danger: "danger" } as const;

export function WardsView() {
  const wards = useWards();
  const totalBeds = wards.reduce((s, w) => s + w.totalBeds, 0);
  const occupied = wards.reduce((s, w) => s + w.occupiedBeds, 0);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Real-time bed capacity. Admit or discharge to update occupancy — the
        dashboard reflects it live.
      </p>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Beds" value={totalBeds} icon={BedDouble} />
        <StatCard label="Occupied" value={occupied} icon={BedDouble} tone="warning" />
        <StatCard
          label="Available"
          value={totalBeds - occupied}
          icon={BedDouble}
          tone="success"
        />
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

                {/* Bed grid */}
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: w.totalBeds }, (_, i) => (
                    <span
                      key={i}
                      title={i < w.occupiedBeds ? "Occupied" : "Available"}
                      className={cn(
                        "size-4 rounded-sm",
                        i < w.occupiedBeds ? toneBar[tone] : "bg-muted",
                      )}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {w.occupiedBeds} occupied ·{" "}
                    <span className="font-medium text-foreground">
                      {free} available
                    </span>
                  </span>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => dischargeFromWard(w.id)}
                      disabled={w.occupiedBeds === 0}
                    >
                      <Minus className="size-3.5" />
                      Discharge
                    </Button>
                    <Button
                      className="h-8 px-2.5 text-xs"
                      onClick={() => admitToWard(w.id)}
                      disabled={free === 0}
                    >
                      <Plus className="size-3.5" />
                      Admit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

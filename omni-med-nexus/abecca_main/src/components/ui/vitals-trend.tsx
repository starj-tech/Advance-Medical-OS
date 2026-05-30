"use client";

import type { VitalSigns } from "@/lib/types";
import { cn } from "@/lib/utils";

type Metric = "heartRate" | "spo2" | "ews" | "systolicBp";

const metrics: Record<
  Metric,
  { label: string; unit: string; stroke: string; fill: string }
> = {
  ews: { label: "EWS", unit: "", stroke: "stroke-primary", fill: "fill-primary/10" },
  heartRate: { label: "Heart Rate", unit: "bpm", stroke: "stroke-rose-500", fill: "fill-rose-500/10" },
  spo2: { label: "SpO₂", unit: "%", stroke: "stroke-sky-500", fill: "fill-sky-500/10" },
  systolicBp: { label: "Systolic BP", unit: "mmHg", stroke: "stroke-amber-500", fill: "fill-amber-500/10" },
};

/**
 * Compact area sparkline for one vital across the recorded history.
 * Pure SVG, no chart dependency; scales to the data's own min/max.
 */
export function VitalsTrend({
  history,
  metric,
  className,
}: {
  history: VitalSigns[];
  metric: Metric;
  className?: string;
}) {
  const m = metrics[metric];
  const values = history.map((h) => h[metric]);
  const w = 240;
  const h = 64;
  const pad = 6;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });

  const line = points.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  const last = values[values.length - 1];

  return (
    <div className={cn("rounded-xl border border-border bg-surface p-4", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
        <span className="text-sm font-semibold tabular-nums">
          {last}
          <span className="ml-0.5 text-xs font-normal text-muted-foreground">
            {m.unit}
          </span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-2 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${m.label} trend`}
      >
        <polygon points={area} className={cn("stroke-none", m.fill)} />
        <polyline
          points={line}
          className={cn("fill-none", m.stroke)}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1][0]}
            cy={points[points.length - 1][1]}
            r="3"
            className={cn(m.stroke, "fill-surface")}
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
}

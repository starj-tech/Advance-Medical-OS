"use client";

import type { DeviceReading } from "@/lib/types-devices";
import { cn } from "@/lib/utils";

/** Live SVG trace of one metric across the reading history. */
export function Waveform({
  history,
  metricKey,
  label,
  unit,
  className,
}: {
  history: DeviceReading[];
  metricKey: string;
  label: string;
  unit: string;
  className?: string;
}) {
  const values = history
    .map((r) => r.metrics[metricKey])
    .filter((v): v is number => typeof v === "number");

  const w = 600;
  const h = 120;
  const pad = 8;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = max - min || 1;

  const pts = values.map((v, i) => {
    const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = values[values.length - 1];

  return (
    <div className={cn("rounded-xl border border-border bg-surface p-4", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums">
          {last ?? "—"}
          <span className="ml-0.5 text-xs font-normal text-muted-foreground">
            {unit}
          </span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-2 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label} waveform`}
      >
        {values.length > 1 ? (
          <polyline
            points={pts.join(" ")}
            className="fill-none stroke-primary"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <text x={w / 2} y={h / 2} textAnchor="middle" className="fill-muted-foreground text-sm">
            waiting for stream…
          </text>
        )}
      </svg>
    </div>
  );
}

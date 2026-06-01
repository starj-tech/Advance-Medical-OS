"use client";

import type { MetricSpec } from "@/lib/devices/types";
import { cn } from "@/lib/utils";

/** Renders a driver's metrics from the latest reading, flagging out-of-range. */
export function MetricGrid({
  metrics,
  values,
}: {
  metrics: MetricSpec[];
  values: Record<string, number | string> | undefined;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {metrics.map((m) => {
        const raw = values?.[m.key];
        const num = typeof raw === "number" ? raw : undefined;
        const display =
          num !== undefined
            ? m.precision
              ? num.toFixed(m.precision)
              : String(num)
            : raw !== undefined
              ? String(raw)
              : "—";
        const outOfRange =
          num !== undefined &&
          ((m.min !== undefined && num < m.min) ||
            (m.max !== undefined && num > m.max));
        return (
          <div
            key={m.key}
            className={cn(
              "rounded-xl border bg-surface p-4",
              outOfRange ? "border-rose-500/40" : "border-border",
            )}
          >
            <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
            <p
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums",
                outOfRange && "text-rose-600 dark:text-rose-400",
              )}
            >
              {display}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {m.unit}
              </span>
            </p>
            {(m.min !== undefined || m.max !== undefined) && (
              <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                normal {m.min ?? "–"}–{m.max ?? "–"}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

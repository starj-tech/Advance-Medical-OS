import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  trend?: { direction: "up" | "down"; value: string };
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneRing: Record<string, string> = {
    default: "text-primary bg-primary/10",
    success: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
    warning: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
    danger: "text-rose-600 bg-rose-500/10 dark:text-rose-400",
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-lg",
            toneRing[tone],
          )}
        >
          <Icon className="size-5" strokeWidth={2} />
        </span>
      </div>
      {(hint || trend) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                trend.direction === "up"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400",
              )}
            >
              {trend.direction === "up" ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {trend.value}
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </Card>
  );
}

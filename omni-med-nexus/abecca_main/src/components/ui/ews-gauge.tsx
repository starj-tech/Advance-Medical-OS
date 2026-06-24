import { acuityFromEws, acuityMeta, cn } from "@/lib/utils";

/**
 * Compact Early Warning Score gauge. The arc fills proportionally to the score
 * (capped at 16 for display) and is colored by the derived acuity band.
 */
export function EwsGauge({ score, className }: { score: number; className?: string }) {
  const max = 16;
  const pct = Math.min(score / max, 1);
  const level = acuityFromEws(score);
  const meta = acuityMeta[level];
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dash = pct * circumference;

  const stroke =
    level === "critical"
      ? "stroke-rose-500"
      : level === "guarded"
        ? "stroke-amber-500"
        : "stroke-emerald-500";

  return (
    <div className={cn("relative grid place-items-center", className)}>
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          className="fill-none stroke-foreground/10"
          strokeWidth="6"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          className={cn("fill-none transition-[stroke-dasharray]", stroke)}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-lg font-semibold tabular-nums", meta.text)}>
          {score}
        </span>
        <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          EWS
        </span>
      </div>
    </div>
  );
}

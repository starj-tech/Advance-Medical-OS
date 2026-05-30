import type { ServiceStatus } from "@/lib/data";
import { cn } from "@/lib/utils";

const meta: Record<
  ServiceStatus,
  { label: string; dot: string; text: string; bg: string; ring: string }
> = {
  operational: {
    label: "Operational",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    ring: "ring-emerald-500/20",
  },
  degraded: {
    label: "Degraded",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    ring: "ring-amber-500/20",
  },
  down: {
    label: "Down",
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    ring: "ring-rose-500/20",
  },
  maintenance: {
    label: "Maintenance",
    dot: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    ring: "ring-sky-500/20",
  },
};

export function StatusPill({ status }: { status: ServiceStatus }) {
  const m = meta[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        m.bg,
        m.text,
        m.ring,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          m.dot,
          status === "operational" && "animate-pulse-ring",
        )}
      />
      {m.label}
    </span>
  );
}

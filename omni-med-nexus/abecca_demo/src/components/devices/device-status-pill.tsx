import type { DeviceStatus } from "@/lib/types-devices";
import { cn } from "@/lib/utils";

const meta: Record<DeviceStatus, { label: string; dot: string; text: string; bg: string }> = {
  streaming: { label: "Streaming", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  connecting: { label: "Connecting", dot: "bg-sky-500", text: "text-sky-700 dark:text-sky-300", bg: "bg-sky-50 dark:bg-sky-950/40" },
  idle: { label: "Idle", dot: "bg-muted-foreground/50", text: "text-muted-foreground", bg: "bg-muted" },
  resetting: { label: "Resetting", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950/40" },
  disconnected: { label: "Disconnected", dot: "bg-muted-foreground/50", text: "text-muted-foreground", bg: "bg-muted" },
  error: { label: "Error", dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-950/40" },
};

export function DeviceStatusPill({ status }: { status: DeviceStatus }) {
  const m = meta[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        m.bg,
        m.text,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          m.dot,
          status === "streaming" && "animate-pulse-ring",
        )}
      />
      {m.label}
    </span>
  );
}

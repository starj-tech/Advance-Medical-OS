import type { AcuityLevel } from "@/lib/types";
import { acuityMeta, cn } from "@/lib/utils";

export function AcuityBadge({
  level,
  className,
}: {
  level: AcuityLevel;
  className?: string;
}) {
  const meta = acuityMeta[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        meta.bg,
        meta.text,
        meta.ring,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

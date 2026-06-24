import { cn } from "@/lib/utils";

type Variant = "default" | "muted" | "success" | "warning" | "danger" | "info";

const variants: Record<Variant, string> = {
  default: "bg-foreground/5 text-foreground ring-foreground/10",
  muted: "bg-muted text-muted-foreground ring-border",
  success:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300",
  danger:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300",
  info: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950/40 dark:text-sky-300",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: { variant?: Variant } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

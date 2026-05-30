import type { Metadata } from "next";
import { Clock, Database, FlaskConical, RotateCcw, ShieldCheck } from "lucide-react";
import { sandboxInfo } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Sandbox" };

export default function SandboxPage() {
  const info = [
    { icon: RotateCcw, label: "Reset cadence", value: sandboxInfo.resetCadence },
    { icon: Database, label: "Data state", value: sandboxInfo.dataState },
    { icon: FlaskConical, label: "Environment", value: sandboxInfo.environment },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        An isolated instance for hands-on practice. Changes are discarded on
        each reset.
      </p>

      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-50 px-5 py-4 dark:bg-emerald-950/30">
        <span className="grid size-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">Sandbox is healthy</p>
          <p className="text-xs text-muted-foreground">
            Safe to experiment — no real patient data is present.
          </p>
        </div>
        <Badge variant="success" className="ml-auto">
          Ready
        </Badge>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {info.map((i) => {
          const Icon = i.icon;
          return (
            <Card key={i.label}>
              <CardContent className="flex flex-col gap-2">
                <Icon className="size-4 text-primary" />
                <p className="text-sm font-medium">{i.value}</p>
                <p className="text-xs text-muted-foreground">{i.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Reset Sandbox</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Restore the sandbox to its seeded baseline. This clears any changes
            you&apos;ve made during training.
          </p>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground/5"
          >
            <RotateCcw className="size-4" />
            Reset now
          </button>
        </CardContent>
      </Card>

      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        Next automatic reset: {sandboxInfo.resetCadence}
      </p>
    </div>
  );
}

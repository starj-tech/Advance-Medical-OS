"use client";

import { useState } from "react";
import {
  Check,
  Clock,
  Database,
  FlaskConical,
  ListChecks,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { sandboxInfo, scenarios } from "@/lib/data";
import { resetAll, useOverallProgress } from "@/lib/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const info = [
  { icon: RotateCcw, label: "Reset cadence", value: sandboxInfo.resetCadence },
  { icon: Database, label: "Data state", value: sandboxInfo.dataState },
  { icon: FlaskConical, label: "Environment", value: sandboxInfo.environment },
];

export function SandboxView() {
  const overall = useOverallProgress(
    scenarios.map((s) => ({ id: s.id, steps: s.steps.length })),
  );
  const pct = overall.total
    ? Math.round((overall.completed / overall.total) * 100)
    : 0;
  const [justReset, setJustReset] = useState(false);

  const doReset = () => {
    resetAll();
    setJustReset(true);
    setTimeout(() => setJustReset(false), 2000);
  };

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

      {/* Live training progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="size-4 text-primary" />
            Your Training Progress
          </CardTitle>
          <Badge variant="muted">
            {overall.completed}/{overall.total} steps
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {pct}% complete across {scenarios.length} scenarios.
          </p>
        </CardContent>
      </Card>

      {/* Reset */}
      <Card>
        <CardHeader>
          <CardTitle>Reset Sandbox</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Restore the sandbox to its seeded baseline. This clears your saved
            training progress on this device.
          </p>
          <Button
            variant="outline"
            className="shrink-0"
            onClick={doReset}
            disabled={overall.completed === 0 && !justReset}
          >
            {justReset ? (
              <>
                <Check className="size-4" />
                Reset done
              </>
            ) : (
              <>
                <RotateCcw className="size-4" />
                Reset now
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        Next automatic reset: {sandboxInfo.resetCadence}
      </p>
    </div>
  );
}

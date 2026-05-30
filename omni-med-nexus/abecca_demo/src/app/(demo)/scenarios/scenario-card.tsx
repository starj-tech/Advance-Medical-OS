"use client";

import { Check, Clock, RotateCcw } from "lucide-react";
import type { Scenario } from "@/lib/data";
import { resetScenario, toggleStep, useScenarioProgress } from "@/lib/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const levelVariant: Record<Scenario["level"], "success" | "warning" | "danger"> = {
  Beginner: "success",
  Intermediate: "warning",
  Advanced: "danger",
};

export function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const done = useScenarioProgress(scenario.id, scenario.steps.length);
  const completed = done.filter(Boolean).length;
  const pct = Math.round((completed / scenario.steps.length) * 100);
  const finished = completed === scenario.steps.length;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {scenario.title}
          {finished && <Badge variant="success">Completed</Badge>}
        </CardTitle>
        <Badge variant={levelVariant[scenario.level]}>{scenario.level}</Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-sm text-muted-foreground">{scenario.summary}</p>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {completed}/{scenario.steps.length}
          </span>
        </div>

        {/* Steps */}
        <ul className="flex flex-col gap-1">
          {scenario.steps.map((step, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggleStep(scenario.id, i)}
                className="flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-foreground/[0.03]"
                aria-pressed={done[i]}
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
                    done[i]
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-transparent",
                  )}
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span
                  className={cn(
                    done[i] && "text-muted-foreground line-through",
                  )}
                >
                  {step}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {scenario.minutes} min
          </span>
          {completed > 0 && (
            <button
              type="button"
              onClick={() => resetScenario(scenario.id, scenario.steps.length)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

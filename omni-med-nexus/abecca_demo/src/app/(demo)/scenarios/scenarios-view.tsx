"use client";

import { useState } from "react";
import { ListChecks } from "lucide-react";
import type { Scenario } from "@/lib/data";
import { scenarios } from "@/lib/data";
import { useOverallProgress } from "@/lib/progress";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ScenarioCard } from "./scenario-card";

const levels: (Scenario["level"] | "all")[] = [
  "all",
  "Beginner",
  "Intermediate",
  "Advanced",
];

export function ScenariosView() {
  const [level, setLevel] = useState<Scenario["level"] | "all">("all");

  const overall = useOverallProgress(
    scenarios.map((s) => ({ id: s.id, steps: s.steps.length })),
  );
  const pct = overall.total
    ? Math.round((overall.completed / overall.total) * 100)
    : 0;

  const filtered = scenarios.filter((s) =>
    level === "all" ? true : s.level === level,
  );

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Guided, step-by-step walkthroughs of core platform workflows. Tick off
        steps as you go — your progress is saved on this device.
      </p>

      {/* Overall progress */}
      <Card>
        <CardContent className="flex items-center gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <ListChecks className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Overall progress</p>
              <span className="text-sm font-semibold tabular-nums">
                {overall.completed}/{overall.total} steps · {pct}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Level filter */}
      <div className="flex items-center gap-1 self-start rounded-lg border border-border bg-surface p-1">
        {levels.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLevel(l)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              level === l
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {l === "all" ? "All levels" : l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((s) => (
          <ScenarioCard key={s.id} scenario={s} />
        ))}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { Clock, PlayCircle } from "lucide-react";
import type { Scenario } from "@/lib/data";
import { scenarios } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Training Scenarios" };

const levelVariant: Record<Scenario["level"], "success" | "warning" | "danger"> = {
  Beginner: "success",
  Intermediate: "warning",
  Advanced: "danger",
};

export default function ScenariosPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Guided, step-by-step walkthroughs of core platform workflows. Each runs
        against synthetic data.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {scenarios.map((s) => (
          <Card key={s.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{s.title}</CardTitle>
              <Badge variant={levelVariant[s.level]}>{s.level}</Badge>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <p className="text-sm text-muted-foreground">{s.summary}</p>
              <ol className="flex flex-col gap-2">
                {s.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />
                  {s.minutes} min
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <PlayCircle className="size-3.5" />
                  Begin
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

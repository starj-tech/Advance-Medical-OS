import type { Metadata } from "next";
import { scenarios } from "@/lib/data";
import { ScenarioCard } from "./scenario-card";

export const metadata: Metadata = { title: "Training Scenarios" };

export default function ScenariosPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Guided, step-by-step walkthroughs of core platform workflows. Tick off
        steps as you go — your progress is saved on this device.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {scenarios.map((s) => (
          <ScenarioCard key={s.id} scenario={s} />
        ))}
      </div>
    </div>
  );
}

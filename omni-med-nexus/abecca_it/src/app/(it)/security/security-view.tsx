"use client";

import { useState } from "react";
import { CircleCheck, Lock, ScanLine, TriangleAlert } from "lucide-react";
import { toggleControl, useControls } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";

export function SecurityView() {
  const controls = useControls();
  const enforced = controls.filter((c) => c.status === "enforced").length;
  const review = controls.filter((c) => c.status === "review").length;

  const [scan, setScan] = useState<"idle" | "running" | "done">("idle");
  const runScan = () => {
    setScan("running");
    setTimeout(() => setScan("done"), 1200);
    setTimeout(() => setScan("idle"), 4000);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Platform-wide security controls and their enforcement status. Toggle a
          control or run a posture scan.
        </p>
        <Button onClick={runScan} disabled={scan === "running"} className="shrink-0">
          <ScanLine className="size-4" />
          {scan === "running" ? "Scanning…" : "Run scan"}
        </Button>
      </div>

      {scan === "done" && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-50 px-5 py-3 text-sm dark:bg-emerald-950/30">
          <CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
          Scan complete · {enforced} enforced, {review} need review.
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Controls" value={controls.length} icon={Lock} />
        <StatCard label="Enforced" value={enforced} icon={CircleCheck} tone="success" />
        <StatCard
          label="Needs Review"
          value={review}
          icon={TriangleAlert}
          tone={review ? "warning" : "success"}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Controls</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {controls.map((c) => {
              const isEnforced = c.status === "enforced";
              return (
                <li key={c.id} className="flex items-center gap-4 px-5 py-4">
                  <span
                    className={
                      isEnforced
                        ? "grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "grid size-10 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }
                  >
                    {isEnforced ? (
                      <CircleCheck className="size-5" />
                    ) : (
                      <TriangleAlert className="size-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.detail}</p>
                  </div>
                  <Badge variant={isEnforced ? "success" : "warning"}>
                    {isEnforced ? "Enforced" : "Review"}
                  </Badge>
                  <Button
                    variant="outline"
                    className="h-8 shrink-0 px-2.5 text-xs"
                    onClick={() => toggleControl(c.id)}
                  >
                    {isEnforced ? "Flag for review" : "Mark enforced"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

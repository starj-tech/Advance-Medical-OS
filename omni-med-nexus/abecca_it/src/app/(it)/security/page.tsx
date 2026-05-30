import type { Metadata } from "next";
import { CircleCheck, Lock, TriangleAlert } from "lucide-react";
import { getSecurityControls } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";

export const metadata: Metadata = { title: "Security Posture" };

export default async function SecurityPage() {
  const controls = await getSecurityControls();
  const enforced = controls.filter((c) => c.status === "enforced").length;
  const review = controls.filter((c) => c.status === "review").length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Platform-wide security controls and their enforcement status.
      </p>

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
              const enforced = c.status === "enforced";
              return (
                <li key={c.id} className="flex items-center gap-4 px-5 py-4">
                  <span
                    className={
                      enforced
                        ? "grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "grid size-10 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }
                  >
                    {enforced ? <CircleCheck className="size-5" /> : <TriangleAlert className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.detail}</p>
                  </div>
                  <Badge variant={enforced ? "success" : "warning"}>
                    {enforced ? "Enforced" : "Review"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

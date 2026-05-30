import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { capabilities } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Feature Showcase" };

export default function ShowcasePage() {
  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Hero */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-surface to-surface p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Omni-Med Nexus
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight">
          Explore the Abecca healthcare platform in a safe, synthetic
          environment.
        </h2>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Every capability below is backed by the real system — the Rust core
          engine and the clinical and administration portals. Nothing here uses
          real patient data.
        </p>
        <Link
          href="/scenarios"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <PlayCircle className="size-4" />
          Start a guided scenario
        </Link>
      </section>

      {/* Capability grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {capabilities.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.title} className="transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{c.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {c.description}
                  </p>
                </div>
                <p className="mt-auto flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <ArrowRight className="size-3" />
                  {c.source}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}

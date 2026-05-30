import type { Metadata } from "next";
import type { Service } from "@/lib/data";
import { getServices } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  const services = await getServices();
  const groups = services.reduce<Record<string, Service[]>>((acc, s) => {
    (acc[s.kind] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Live status, 30-day uptime and latency for every component of the stack.
      </p>

      {Object.entries(groups).map(([kind, items]) => (
        <Card key={kind}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {kind}
              <Badge variant="muted">{items.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {items.map((s) => (
                <li key={s.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{s.name}</p>
                      <StatusPill status={s.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.detail}
                    </p>
                  </div>
                  <dl className="flex gap-6">
                    <div className="text-right">
                      <dd className="text-sm font-semibold tabular-nums">{s.uptime}%</dd>
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Uptime
                      </dt>
                    </div>
                    <div className="text-right">
                      <dd className="text-sm font-semibold tabular-nums">
                        {s.status === "maintenance" ? "—" : `${s.latencyMs}ms`}
                      </dd>
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Latency
                      </dt>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Receipt, Search, Trash2 } from "lucide-react";
import type { Tariff } from "@/lib/types";
import { seedTariffs } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { cn, formatIDR } from "@/lib/utils";

const categoryVariant = {
  Consultation: "info",
  Emergency: "danger",
  Laboratory: "warning",
  Procedure: "success",
} as const;

export function TariffsView() {
  const tariffs = seedTariffs;
  const categories = useMemo(
    () => [...new Set(tariffs.map((t) => t.category))],
    [tariffs],
  );

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Tariff["category"] | "all">("all");
  // estimate: map of tariff id -> quantity
  const [cart, setCart] = useState<Record<number, number>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tariffs
      .filter((t) => (category === "all" ? true : t.category === category))
      .filter((t) =>
        q === ""
          ? true
          : t.procedureName.toLowerCase().includes(q) ||
            t.procedureCode.toLowerCase().includes(q),
      );
  }, [tariffs, query, category]);

  const add = (id: number) =>
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const remove = (id: number) =>
    setCart((c) => {
      const next = { ...c };
      const v = (next[id] ?? 0) - 1;
      if (v <= 0) delete next[id];
      else next[id] = v;
      return next;
    });

  const lines = Object.entries(cart).map(([id, qty]) => {
    const t = tariffs.find((x) => x.id === Number(id))!;
    return { tariff: t, qty, subtotal: t.basePrice * qty };
  });
  const total = lines.reduce((s, l) => s + l.subtotal, 0);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Procedure tariffs in IDR. Build a quick cost estimate by adding
        procedures on the right.
      </p>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Procedures" value={tariffs.length} icon={Receipt} />
        <StatCard label="Categories" value={categories.length} icon={Receipt} />
        <StatCard
          label="Estimate Total"
          value={formatIDR(total)}
          icon={Receipt}
          tone={total > 0 ? "success" : "default"}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Catalogue */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search procedure or code…"
                aria-label="Search tariffs"
                className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as Tariff["category"] | "all")
              }
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {filtered.map((t) => (
                  <li key={t.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {t.procedureCode}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {t.procedureName}
                      </p>
                      <Badge variant={categoryVariant[t.category]}>
                        {t.category}
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatIDR(t.basePrice)}
                    </span>
                    <Button
                      className="h-8 px-2.5 text-xs"
                      onClick={() => add(t.id)}
                    >
                      <Plus className="size-3.5" />
                      Add
                    </Button>
                  </li>
                ))}
              </ul>
              {filtered.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No procedures match your filters.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Estimate */}
        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Estimate</CardTitle>
            {lines.length > 0 && (
              <button
                type="button"
                onClick={() => setCart({})}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="size-3.5" />
                Clear
              </button>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {lines.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Add procedures to build an estimate.
              </p>
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {lines.map((l) => (
                    <li
                      key={l.tariff.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {l.tariff.procedureName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="Remove one"
                          onClick={() => remove(l.tariff.id)}
                          className="grid size-6 place-items-center rounded border border-border text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-5 text-center tabular-nums">
                          {l.qty}
                        </span>
                        <button
                          type="button"
                          aria-label="Add one"
                          onClick={() => add(l.tariff.id)}
                          className="grid size-6 place-items-center rounded border border-border text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                      <span className="w-24 text-right tabular-nums">
                        {formatIDR(l.subtotal)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div
                  className={cn(
                    "mt-1 flex items-center justify-between border-t border-border pt-3",
                    "text-sm font-semibold",
                  )}
                >
                  <span>Total</span>
                  <span className="tabular-nums">{formatIDR(total)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

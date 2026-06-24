"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, UtensilsCrossed } from "lucide-react";
import type { DietOrder, DietRoute } from "@/server/clinical/diet";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const DIET_TYPES = [
  "Diet Biasa",
  "Diet Lunak",
  "Diet Saring",
  "Diet Cair",
  "Diet DM (Diabetes)",
  "Diet Rendah Garam",
  "Diet Rendah Protein",
  "Diet Tinggi Kalori Tinggi Protein (TKTP)",
  "Diet Rendah Lemak",
  "Puasa (NPO)",
];
const ROUTE_LABEL: Record<DietRoute, string> = {
  oral: "Oral", enteral: "Enteral (NGT/sonde)", parenteral: "Parenteral",
};

const EMPTY = { dietType: DIET_TYPES[0], route: "oral" as DietRoute, caloriesKcal: "", restrictions: "" };

export function DietPanel({ encounterId, active }: { encounterId: string; active: boolean }) {
  const [orders, setOrders] = useState<DietOrder[]>([]);
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/encounters/${encounterId}/diet`);
    if (res.ok) setOrders(await res.json());
  }, [encounterId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const submit = async () => {
    if (!draft.dietType.trim()) return;
    setSaving(true);
    const kcal = Number.parseInt(draft.caloriesKcal, 10);
    const res = await fetch(`/api/encounters/${encounterId}/diet`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        dietType: draft.dietType,
        route: draft.route,
        caloriesKcal: Number.isFinite(kcal) && kcal > 0 ? kcal : null,
        restrictions: draft.restrictions.trim() || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setDraft(EMPTY);
      await load();
    }
  };

  const discontinue = async (orderId: string) => {
    const res = await fetch(`/api/encounters/${encounterId}/diet`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, status: "discontinued" }),
    });
    if (res.ok) await load();
  };

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <UtensilsCrossed className="size-3.5" /> Order Diet & Gizi
      </span>
      {orders.length === 0 ? (
        <p className="text-xs text-muted-foreground">Belum ada order diet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {orders.map((o) => (
            <li key={o.id} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <div className="mb-0.5 flex flex-wrap items-center gap-2">
                <span className="font-semibold">{o.dietType}</span>
                <Badge variant={o.status === "active" ? "success" : "muted"}>
                  {o.status === "active" ? "Aktif" : "Dihentikan"}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(o.createdAt)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {ROUTE_LABEL[o.route]}
                {o.caloriesKcal ? ` · ${o.caloriesKcal} kkal` : ""}
                {o.restrictions ? ` · ${o.restrictions}` : ""}
              </p>
              {active && o.status === "active" && (
                <Can permission="diet:write">
                  <Button size="sm" variant="ghost" className="mt-1.5" onClick={() => discontinue(o.id)}>
                    Hentikan
                  </Button>
                </Can>
              )}
            </li>
          ))}
        </ul>
      )}

      {active && (
        <Can permission="diet:write">
          <div className="grid gap-2 sm:grid-cols-2">
            <select className={inputCls} value={draft.dietType}
              onChange={(e) => setDraft((d) => ({ ...d, dietType: e.target.value }))} aria-label="Jenis diet">
              {DIET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className={inputCls} value={draft.route}
              onChange={(e) => setDraft((d) => ({ ...d, route: e.target.value as DietRoute }))} aria-label="Jalur pemberian">
              {(Object.keys(ROUTE_LABEL) as DietRoute[]).map((r) => (
                <option key={r} value={r}>{ROUTE_LABEL[r]}</option>
              ))}
            </select>
            <input className={inputCls} type="number" min={0} value={draft.caloriesKcal}
              onChange={(e) => setDraft((d) => ({ ...d, caloriesKcal: e.target.value }))}
              placeholder="Target kalori (kkal, opsional)" aria-label="Target kalori" />
            <input className={inputCls} value={draft.restrictions}
              onChange={(e) => setDraft((d) => ({ ...d, restrictions: e.target.value }))}
              placeholder="Pantangan / restriksi (opsional)" aria-label="Pantangan" />
            <div className="sm:col-span-2">
              <Button size="sm" onClick={submit} disabled={saving || !draft.dietType.trim()}>
                <Plus className="size-4" /> Tambah Order Diet
              </Button>
            </div>
          </div>
        </Can>
      )}
    </div>
  );
}

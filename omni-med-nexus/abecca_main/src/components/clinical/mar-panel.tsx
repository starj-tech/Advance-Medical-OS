"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import type { MedicationOrder } from "@/server/clinical/medication-orders";
import type {
  AdministrationStatus,
  MedicationAdministration,
} from "@/server/clinical/medication-administrations";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const STATUS_STYLE: Record<AdministrationStatus, string> = {
  given: "text-emerald-700 dark:text-emerald-300",
  held: "text-amber-700 dark:text-amber-300",
  refused: "text-rose-700 dark:text-rose-300",
  missed: "text-muted-foreground",
};
const STATUS_LABEL: Record<AdministrationStatus, string> = {
  given: "diberikan",
  held: "ditunda",
  refused: "ditolak",
  missed: "terlewat",
};

const ACTIONS: { status: AdministrationStatus; label: string; variant: "primary" | "outline" | "ghost" }[] = [
  { status: "given", label: "Beri", variant: "primary" },
  { status: "held", label: "Tunda", variant: "outline" },
  { status: "refused", label: "Tolak", variant: "ghost" },
];

export function MarPanel({ encounterId, active }: { encounterId: string; active: boolean }) {
  const [orders, setOrders] = useState<MedicationOrder[]>([]);
  const [admins, setAdmins] = useState<MedicationAdministration[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [oRes, aRes] = await Promise.all([
      fetch(`/api/encounters/${encounterId}/medication-orders`),
      fetch(`/api/encounters/${encounterId}/medication-administrations`),
    ]);
    if (oRes.ok) setOrders(await oRes.json());
    if (aRes.ok) setAdmins(await aRes.json());
  }, [encounterId]);

  useEffect(() => {
    // Async load; state set after await (false positive for the rule).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const administer = async (orderId: string, status: AdministrationStatus) => {
    setBusy(orderId + status);
    const res = await fetch(`/api/encounters/${encounterId}/medication-administrations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
    if (res.ok) await load();
    setBusy(null);
  };

  const activeOrders = orders.filter((o) => o.status === "active");

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ClipboardCheck className="size-3.5" /> e-MAR — Pemberian Obat
      </span>

      {activeOrders.length === 0 ? (
        <p className="text-xs text-muted-foreground">Tidak ada order aktif untuk diberikan.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {activeOrders.map((o) => {
            const log = admins.filter((a) => a.orderId === o.id);
            return (
              <li key={o.id} className="rounded-lg border border-border bg-background px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">{o.drugName}</span>{" "}
                    <span className="text-muted-foreground">
                      {[o.dose, o.route, o.frequency].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {active && (
                    <Can permission="mar:administer">
                      <div className="flex gap-1.5">
                        {ACTIONS.map((a) => (
                          <Button
                            key={a.status}
                            size="sm"
                            variant={a.variant}
                            disabled={busy === o.id + a.status}
                            onClick={() => administer(o.id, a.status)}
                          >
                            {a.label}
                          </Button>
                        ))}
                      </div>
                    </Can>
                  )}
                </div>
                {log.length > 0 && (
                  <ul className="mt-1.5 flex flex-col gap-0.5 border-t border-border pt-1.5">
                    {log.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-xs">
                        <span className={`font-medium ${STATUS_STYLE[a.status]}`}>
                          {STATUS_LABEL[a.status]}
                        </span>
                        {a.doseGiven && <span className="text-muted-foreground">{a.doseGiven}</span>}
                        <span className="ml-auto text-[11px] text-muted-foreground">
                          {formatDate(a.administeredAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

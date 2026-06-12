"use client";

import { useCallback, useEffect, useState } from "react";
import { FlaskConical, Plus } from "lucide-react";
import type { DiagnosticCategory, ResultFlag } from "@/lib/diagnostic-catalog";
import { DIAGNOSTIC_CATALOG } from "@/lib/diagnostic-catalog";
import type { DiagnosticOrder, DiagnosticStatus } from "@/server/clinical/diagnostic-orders";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const STATUS_LABEL: Record<DiagnosticStatus, string> = {
  ordered: "Dipesan",
  collected: "Sampel diambil",
  in_progress: "Diproses",
  resulted: "Ada hasil",
  verified: "Terverifikasi",
  cancelled: "Dibatalkan",
};
const STATUS_VARIANT: Record<DiagnosticStatus, "muted" | "info" | "warning" | "success" | "danger"> = {
  ordered: "muted",
  collected: "info",
  in_progress: "warning",
  resulted: "info",
  verified: "success",
  cancelled: "danger",
};
const FLAG_LABEL: Record<Exclude<ResultFlag, "unknown">, string> = {
  normal: "Normal", abnormal: "Abnormal", critical: "Kritis",
};
const FLAG_VARIANT: Record<Exclude<ResultFlag, "unknown">, "success" | "warning" | "danger"> = {
  normal: "success", abnormal: "warning", critical: "danger",
};
const STATUSES = Object.keys(STATUS_LABEL) as DiagnosticStatus[];
const PRIORITIES = ["routine", "urgent", "stat"] as const;
const PRIORITY_LABEL: Record<string, string> = { routine: "Rutin", urgent: "Urgen", stat: "Cito" };

export function DiagnosticsPanel({ encounterId, active }: { encounterId: string; active: boolean }) {
  const [orders, setOrders] = useState<DiagnosticOrder[]>([]);
  const [category, setCategory] = useState<DiagnosticCategory>("lab");
  const [testCode, setTestCode] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("routine");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const tests = DIAGNOSTIC_CATALOG.filter((t) => t.category === category);

  const load = useCallback(async () => {
    const res = await fetch(`/api/encounters/${encounterId}/diagnostic-orders`);
    if (res.ok) setOrders(await res.json());
  }, [encounterId]);

  useEffect(() => {
    // Async load; state set after await (false positive for the rule).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const onCategory = (c: DiagnosticCategory) => {
    setCategory(c);
    setTestCode("");
  };

  const placeOrder = async () => {
    const code = testCode || tests[0]?.code;
    if (!code) return;
    const res = await fetch(`/api/encounters/${encounterId}/diagnostic-orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ testCode: code, priority }),
    });
    if (res.ok) await load();
  };

  const setStatus = async (orderId: string, status: DiagnosticStatus) => {
    const res = await fetch(`/api/encounters/${encounterId}/diagnostic-orders`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
    if (res.ok) await load();
  };

  const saveResult = async (orderId: string) => {
    const value = (drafts[orderId] ?? "").trim();
    if (!value) return;
    const res = await fetch(`/api/encounters/${encounterId}/diagnostic-orders`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, resultValue: value }),
    });
    if (res.ok) {
      setDrafts((d) => ({ ...d, [orderId]: "" }));
      await load();
    }
  };

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <FlaskConical className="size-3.5" /> Order Lab & Radiologi
      </span>

      {orders.length === 0 ? (
        <p className="text-xs text-muted-foreground">Belum ada order penunjang.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {orders.map((o) => (
            <li key={o.id} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={o.category === "lab" ? "info" : "muted"}>
                  {o.category === "lab" ? "Lab" : "Radiologi"}
                </Badge>
                <span className="font-medium">{o.testName}</span>
                {o.priority !== "routine" && (
                  <Badge variant={o.priority === "stat" ? "danger" : "warning"}>
                    {PRIORITY_LABEL[o.priority]}
                  </Badge>
                )}
                <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                {o.resultFlag && o.resultFlag !== "unknown" && (
                  <Badge variant={FLAG_VARIANT[o.resultFlag]}>{FLAG_LABEL[o.resultFlag]}</Badge>
                )}
                {o.accession && (
                  <span className="font-mono text-[11px] text-muted-foreground">{o.accession}</span>
                )}
                <span className="ml-auto text-[11px] text-muted-foreground">{formatDate(o.orderedAt)}</span>
              </div>
              {o.resultValue && (
                <p className="mt-1 text-xs">
                  <span className="font-semibold">Hasil:</span> {o.resultValue}
                  {o.resultNote ? ` — ${o.resultNote}` : ""}
                </p>
              )}
              {active && o.status !== "cancelled" && o.status !== "verified" && (
                <Can permission="diagnostic:result">
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      value={drafts[o.id] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [o.id]: e.target.value }))}
                      placeholder="Nilai hasil…"
                      className={`${inputCls} flex-1`}
                      aria-label="Nilai hasil"
                    />
                    <Button size="sm" onClick={() => saveResult(o.id)} disabled={!(drafts[o.id] ?? "").trim()}>
                      Simpan Hasil
                    </Button>
                    <select
                      value={o.status}
                      onChange={(e) => setStatus(o.id, e.target.value as DiagnosticStatus)}
                      className={inputCls}
                      aria-label="Status order"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </div>
                </Can>
              )}
            </li>
          ))}
        </ul>
      )}

      {active && (
        <Can permission="diagnostic:order">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={category}
              onChange={(e) => onCategory(e.target.value as DiagnosticCategory)}
              className={inputCls}
              aria-label="Kategori"
            >
              <option value="lab">Lab</option>
              <option value="radiology">Radiologi</option>
            </select>
            <select
              value={testCode || tests[0]?.code || ""}
              onChange={(e) => setTestCode(e.target.value)}
              className={`${inputCls} flex-1`}
              aria-label="Pemeriksaan"
            >
              {tests.map((t) => (
                <option key={t.code} value={t.code}>{t.name}</option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as (typeof PRIORITIES)[number])}
              className={inputCls}
              aria-label="Prioritas"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
              ))}
            </select>
            <Button size="sm" onClick={placeOrder}>
              <Plus className="size-4" /> Order
            </Button>
          </div>
        </Can>
      )}
    </div>
  );
}

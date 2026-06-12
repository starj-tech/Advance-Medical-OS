"use client";

import { useCallback, useEffect, useState } from "react";
import { FlaskConical, ShieldCheck, TestTube2 } from "lucide-react";
import type { DiagnosticOrder, DiagnosticStatus } from "@/server/clinical/diagnostic-orders";
import type { ResultFlag } from "@/lib/diagnostic-catalog";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const STATUS_LABEL: Record<DiagnosticStatus, string> = {
  ordered: "Dipesan", collected: "Sampel diambil", in_progress: "Diproses",
  resulted: "Ada hasil", verified: "Terverifikasi", cancelled: "Batal",
};
const STATUS_VARIANT: Record<DiagnosticStatus, "muted" | "info" | "warning" | "success" | "danger"> = {
  ordered: "muted", collected: "info", in_progress: "warning",
  resulted: "info", verified: "success", cancelled: "danger",
};
const FLAG_LABEL: Record<Exclude<ResultFlag, "unknown">, string> = {
  normal: "Normal", abnormal: "Abnormal", critical: "Kritis",
};
const FLAG_VARIANT: Record<Exclude<ResultFlag, "unknown">, "success" | "warning" | "danger"> = {
  normal: "success", abnormal: "warning", critical: "danger",
};

type CatFilter = "all" | "lab" | "radiology";
const inputCls =
  "h-8 w-28 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

export function DiagnosticsWorklistView() {
  const [orders, setOrders] = useState<DiagnosticOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<CatFilter>("all");
  const [results, setResults] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const qs = cat === "all" ? "" : `?category=${cat}`;
    const res = await fetch(`/api/diagnostics/worklist${qs}`);
    setOrders(res.ok ? await res.json() : []);
    setLoading(false);
  }, [cat]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const act = async (id: string, action: "collect" | "result" | "verify", resultValue?: string) => {
    const res = await fetch(`/api/diagnostics/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, resultValue }),
    });
    if (res.ok) await load();
  };

  // Pending = anything not yet verified/cancelled.
  const pending = orders.filter((o) => o.status !== "verified" && o.status !== "cancelled");
  const critical = orders.filter((o) => o.resultFlag === "critical" && o.status !== "verified").length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Worklist Lab &amp; Radiologi (LIS)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Antrean order lintas-pasien: ambil sampel → input hasil → validasi. Nilai kritis ditandai merah
          dan dieskalasi otomatis ke DPJP.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="size-4 text-primary" /> Antrean Pemeriksaan
          </CardTitle>
          <div className="flex items-center gap-2">
            {critical > 0 && <Badge variant="danger">{critical} nilai kritis</Badge>}
            <Badge variant={pending.length ? "warning" : "success"}>{pending.length} tertunda</Badge>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value as CatFilter)}
              aria-label="Filter kategori"
              className="h-8 rounded-lg border border-border bg-surface px-2 text-sm outline-none"
            >
              <option value="all">Semua</option>
              <option value="lab">Lab</option>
              <option value="radiology">Radiologi</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Memuat…</p>
          ) : orders.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">
              Belum ada order pemeriksaan.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{o.testName}</span>
                      <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                      {o.priority !== "routine" && (
                        <Badge variant={o.priority === "stat" ? "danger" : "warning"}>
                          {o.priority.toUpperCase()}
                        </Badge>
                      )}
                      {o.resultFlag && o.resultFlag !== "unknown" && (
                        <Badge variant={FLAG_VARIANT[o.resultFlag]}>{FLAG_LABEL[o.resultFlag]}</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {o.category === "lab" ? "Lab" : "Radiologi"} · Pasien {o.patientId}
                      {o.accession ? ` · ${o.accession}` : ""}
                      {o.resultValue ? ` · Hasil: ${o.resultValue}` : ""} · {formatDateTime(o.orderedAt)}
                    </p>
                  </div>

                  {o.status === "ordered" && (
                    <Can permission="diagnostic:result">
                      <Button size="sm" variant="outline" onClick={() => act(o.id, "collect")}>
                        <TestTube2 className="size-4" /> Ambil sampel
                      </Button>
                    </Can>
                  )}
                  {(o.status === "collected" || o.status === "in_progress") && (
                    <Can permission="diagnostic:result">
                      <span className="flex items-center gap-1.5">
                        <input
                          className={inputCls}
                          value={results[o.id] ?? ""}
                          onChange={(e) => setResults((r) => ({ ...r, [o.id]: e.target.value }))}
                          placeholder="Nilai hasil"
                          aria-label={`Hasil ${o.testName}`}
                        />
                        <Button
                          size="sm"
                          disabled={!(results[o.id] ?? "").trim()}
                          onClick={() => act(o.id, "result", (results[o.id] ?? "").trim())}
                        >
                          Simpan hasil
                        </Button>
                      </span>
                    </Can>
                  )}
                  {o.status === "resulted" && (
                    <Can permission="diagnostic:verify">
                      <Button size="sm" variant="outline" onClick={() => act(o.id, "verify")}>
                        <ShieldCheck className="size-4" /> Validasi
                      </Button>
                    </Can>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

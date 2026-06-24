"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FlaskConical, ShieldCheck, TestTube2, FileText, ScanLine } from "lucide-react";
import type { DiagnosticOrder, DiagnosticStatus } from "@/server/clinical/diagnostic-orders";
import type { Modality, ResultFlag } from "@/lib/diagnostic-catalog";
import { MODALITIES } from "@/lib/diagnostic-catalog";
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
type ModalityFilter = "all" | Modality;
type ReportDraft = { findings: string; impression: string; recommendation: string };
const emptyReport: ReportDraft = { findings: "", impression: "", recommendation: "" };

const inputCls =
  "h-8 w-28 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
const fieldCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

export function DiagnosticsWorklistView() {
  const [orders, setOrders] = useState<DiagnosticOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<CatFilter>("all");
  const [modality, setModality] = useState<ModalityFilter>("all");
  const [results, setResults] = useState<Record<string, string>>({});
  const [openReport, setOpenReport] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, ReportDraft>>({});

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

  const act = async (
    id: string,
    action: "collect" | "result" | "verify" | "report",
    payload?: Record<string, unknown>,
  ) => {
    const res = await fetch(`/api/diagnostics/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    if (res.ok) {
      setOpenReport(null);
      await load();
    }
  };

  const submitReport = (id: string) => {
    const d = reports[id] ?? emptyReport;
    if (!d.impression.trim()) return;
    void act(id, "report", {
      findings: d.findings.trim(),
      impression: d.impression.trim(),
      recommendation: d.recommendation.trim(),
    });
  };
  const patchReport = (id: string, patch: Partial<ReportDraft>) =>
    setReports((r) => ({ ...r, [id]: { ...(r[id] ?? emptyReport), ...patch } }));

  const onCat = (c: CatFilter) => {
    setCat(c);
    if (c !== "radiology") setModality("all");
  };

  // The modality filter is a client-side narrowing of the radiology worklist
  // (a "CT worklist", "MRI worklist", … — the RIS modality work-queue).
  const visible = useMemo(
    () =>
      orders.filter(
        (o) => modality === "all" || (o.category === "radiology" && o.modality === modality),
      ),
    [orders, modality],
  );
  const pending = visible.filter((o) => o.status !== "verified" && o.status !== "cancelled");
  const critical = visible.filter(
    (o) => o.resultFlag === "critical" && o.status !== "verified",
  ).length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Worklist Lab &amp; Radiologi (LIS/RIS)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Antrean lintas-pasien — lab: ambil sampel → input hasil → validasi; radiologi: daftarkan studi
          → laporan terstruktur (temuan/kesan/saran) → validasi. Nilai kritis ditandai merah dan
          dieskalasi otomatis ke DPJP.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="size-4 text-primary" /> Antrean Pemeriksaan
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {critical > 0 && <Badge variant="danger">{critical} nilai kritis</Badge>}
            <Badge variant={pending.length ? "warning" : "success"}>{pending.length} tertunda</Badge>
            <select
              value={cat}
              onChange={(e) => onCat(e.target.value as CatFilter)}
              aria-label="Filter kategori"
              className="h-8 rounded-lg border border-border bg-surface px-2 text-sm outline-none"
            >
              <option value="all">Semua</option>
              <option value="lab">Lab</option>
              <option value="radiology">Radiologi</option>
            </select>
            {cat === "radiology" && (
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value as ModalityFilter)}
                aria-label="Filter modality"
                className="h-8 rounded-lg border border-border bg-surface px-2 text-sm outline-none"
              >
                <option value="all">Semua modality</option>
                {MODALITIES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Memuat…</p>
          ) : visible.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">
              Belum ada order pemeriksaan.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((o) => {
                const isRad = o.category === "radiology";
                const inProgress = o.status === "collected" || o.status === "in_progress";
                return (
                  <li key={o.id} className="flex flex-col gap-2 px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{o.testName}</span>
                          <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                          {isRad && o.modality && <Badge variant="info">{o.modality}</Badge>}
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
                          {isRad ? "Radiologi" : "Lab"} · Pasien {o.patientId}
                          {o.accession ? ` · ${o.accession}` : ""}
                          {o.resultValue ? ` · ${isRad ? "Kesan" : "Hasil"}: ${o.resultValue}` : ""} ·{" "}
                          {formatDateTime(o.orderedAt)}
                        </p>
                      </div>

                      {o.status === "ordered" && (
                        <Can permission="diagnostic:result">
                          <Button size="sm" variant="outline" onClick={() => act(o.id, "collect")}>
                            {isRad ? (
                              <>
                                <ScanLine className="size-4" /> Daftarkan studi
                              </>
                            ) : (
                              <>
                                <TestTube2 className="size-4" /> Ambil sampel
                              </>
                            )}
                          </Button>
                        </Can>
                      )}

                      {inProgress && !isRad && (
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
                              onClick={() => act(o.id, "result", { resultValue: (results[o.id] ?? "").trim() })}
                            >
                              Simpan hasil
                            </Button>
                          </span>
                        </Can>
                      )}

                      {inProgress && isRad && (
                        <Can permission="diagnostic:result">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setOpenReport((cur) => (cur === o.id ? null : o.id))}
                          >
                            <FileText className="size-4" /> {openReport === o.id ? "Tutup" : "Buat laporan"}
                          </Button>
                        </Can>
                      )}

                      {o.status === "resulted" && (
                        <Can permission="diagnostic:verify">
                          <Button size="sm" variant="outline" onClick={() => act(o.id, "verify")}>
                            <ShieldCheck className="size-4" /> Validasi
                          </Button>
                        </Can>
                      )}
                    </div>

                    {/* Structured radiology report editor (RIS). */}
                    {isRad && inProgress && openReport === o.id && (
                      <Can permission="diagnostic:result">
                        <div className="rounded-lg border border-border bg-muted/40 p-3">
                          <div className="grid gap-2">
                            <label className="text-xs font-medium text-muted-foreground">
                              Temuan (findings)
                              <textarea
                                rows={3}
                                className={`${fieldCls} mt-1`}
                                value={reports[o.id]?.findings ?? ""}
                                onChange={(e) => patchReport(o.id, { findings: e.target.value })}
                                placeholder="Deskripsi sistematis temuan radiologis…"
                              />
                            </label>
                            <label className="text-xs font-medium text-muted-foreground">
                              Kesan / impression <span className="text-danger">*</span>
                              <textarea
                                rows={2}
                                className={`${fieldCls} mt-1`}
                                value={reports[o.id]?.impression ?? ""}
                                onChange={(e) => patchReport(o.id, { impression: e.target.value })}
                                placeholder="Kesimpulan diagnostik…"
                              />
                            </label>
                            <label className="text-xs font-medium text-muted-foreground">
                              Saran (opsional)
                              <input
                                className={`${fieldCls} mt-1`}
                                value={reports[o.id]?.recommendation ?? ""}
                                onChange={(e) => patchReport(o.id, { recommendation: e.target.value })}
                                placeholder="Rekomendasi tindak lanjut…"
                              />
                            </label>
                          </div>
                          <div className="mt-2 flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setOpenReport(null)}>
                              Batal
                            </Button>
                            <Button
                              size="sm"
                              disabled={!(reports[o.id]?.impression ?? "").trim()}
                              onClick={() => submitReport(o.id)}
                            >
                              Simpan laporan
                            </Button>
                          </div>
                        </div>
                      </Can>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

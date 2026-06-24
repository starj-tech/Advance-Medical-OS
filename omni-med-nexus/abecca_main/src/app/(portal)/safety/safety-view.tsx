"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ClipboardList, Plus, ShieldAlert, Siren } from "lucide-react";
import type { Grading, IkpReport, IkpStatus, IncidentType } from "@/server/safety/ikp";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const TYPES: IncidentType[] = ["KPC", "KNC", "KTC", "KTD", "sentinel"];
const TYPE_LABEL: Record<IncidentType, string> = {
  KPC: "KPC · Kondisi Potensial Cedera",
  KNC: "KNC · Nyaris Cedera",
  KTC: "KTC · Tidak Cedera",
  KTD: "KTD · Tidak Diharapkan",
  sentinel: "Sentinel",
};
const GRADINGS: Grading[] = ["biru", "hijau", "kuning", "merah"];
const GRADING_VARIANT: Record<Grading, "info" | "success" | "warning" | "danger"> = {
  biru: "info", hijau: "success", kuning: "warning", merah: "danger",
};
const STATUSES: IkpStatus[] = ["reported", "investigating", "closed"];
const STATUS_LABEL: Record<IkpStatus, string> = {
  reported: "Dilaporkan", investigating: "Investigasi", closed: "Selesai",
};
const STATUS_VARIANT: Record<IkpStatus, "muted" | "warning" | "success"> = {
  reported: "muted", investigating: "warning", closed: "success",
};

const EMPTY = { incidentType: "KNC" as IncidentType, title: "", description: "", location: "", patientId: "", incidentDate: "" };

export function SafetyView() {
  const [reports, setReports] = useState<IkpReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(EMPTY);

  const load = useCallback(async () => {
    const res = await fetch("/api/ikp");
    const data: IkpReport[] = res.ok ? await res.json() : [];
    setReports(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Async load; state set after await (false positive for the rule).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const submit = async () => {
    if (!draft.title.trim()) return;
    const res = await fetch("/api/ikp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      setDraft(EMPTY);
      await load();
    }
  };

  const patch = async (id: string, body: { grading?: Grading; status?: IkpStatus }) => {
    const res = await fetch(`/api/ikp/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) await load();
  };

  const open = reports.filter((r) => r.status !== "closed").length;
  const sentinel = reports.filter((r) => r.incidentType === "sentinel").length;
  const merah = reports.filter((r) => r.grading === "merah").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Insiden" value={reports.length} icon={ClipboardList} />
        <StatCard label="Dalam Proses" value={open} icon={AlertTriangle} tone="warning" />
        <StatCard label="Sentinel" value={sentinel} icon={Siren} tone="danger" />
        <StatCard label="Grading Merah" value={merah} icon={ShieldAlert} tone="danger" />
      </div>

      <Can permission="ikp:report">
        <Card>
          <CardHeader>
            <CardTitle>Laporkan Insiden Keselamatan Pasien</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <select
              value={draft.incidentType}
              onChange={(e) => setDraft((d) => ({ ...d, incidentType: e.target.value as IncidentType }))}
              className={inputCls}
              aria-label="Jenis insiden"
            >
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Judul insiden"
              className={inputCls}
              aria-label="Judul"
            />
            <input
              value={draft.location}
              onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
              placeholder="Lokasi (unit/ruang)"
              className={inputCls}
              aria-label="Lokasi"
            />
            <input
              type="date"
              value={draft.incidentDate}
              onChange={(e) => setDraft((d) => ({ ...d, incidentDate: e.target.value }))}
              className={inputCls}
              aria-label="Tanggal insiden"
            />
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Kronologi singkat…"
              className={`${inputCls} min-h-[60px] py-2 sm:col-span-2`}
              aria-label="Kronologi"
            />
            <div className="sm:col-span-2">
              <Button size="sm" onClick={submit} disabled={!draft.title.trim()}>
                <Plus className="size-4" /> Laporkan
              </Button>
            </div>
          </CardContent>
        </Card>
      </Can>

      <Card>
        <CardHeader>
          <CardTitle>Register Insiden</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Memuat…</p>
          ) : reports.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada laporan insiden.</p>
          ) : (
            <ul className="divide-y divide-border">
              {reports.map((r) => (
                <li key={r.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="muted">{r.incidentType}</Badge>
                    <span className="min-w-0 flex-1 text-sm font-medium">{r.title}</span>
                    {r.grading && <Badge variant={GRADING_VARIANT[r.grading]}>{r.grading}</Badge>}
                    <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    <span className="text-[11px] text-muted-foreground">{formatDate(r.createdAt)}</span>
                  </div>
                  {(r.location || r.description) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.location ? `${r.location} — ` : ""}{r.description}
                    </p>
                  )}
                  <Can permission="ikp:manage">
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">Grading:</span>
                      <select
                        value={r.grading ?? ""}
                        onChange={(e) => patch(r.id, { grading: e.target.value as Grading })}
                        className={inputCls}
                        aria-label="Grading risiko"
                      >
                        <option value="" disabled>—</option>
                        {GRADINGS.map((gr) => <option key={gr} value={gr}>{gr}</option>)}
                      </select>
                      <select
                        value={r.status}
                        onChange={(e) => patch(r.id, { status: e.target.value as IkpStatus })}
                        className={inputCls}
                        aria-label="Status"
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                    </div>
                  </Can>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

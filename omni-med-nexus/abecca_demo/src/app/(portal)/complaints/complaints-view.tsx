"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, MessageSquareWarning } from "lucide-react";
import type { Complaint, ComplaintSummary } from "@/server/quality/complaints";
import {
  COMPLAINT_CATEGORIES, COMPLAINT_CATEGORY_LABEL,
  COMPLAINT_SEVERITIES, COMPLAINT_SEVERITY_LABEL, COMPLAINT_SEVERITY_VARIANT,
  COMPLAINT_STATUSES, COMPLAINT_STATUS_LABEL, COMPLAINT_STATUS_VARIANT,
  SLA_TARGET_DAYS, SLA_STATE_LABEL, SLA_STATE_VARIANT,
  slaState,
  type ComplaintCategory, type ComplaintSeverity, type ComplaintStatus,
} from "@/lib/complaints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY = {
  reporter: "", patientId: "", category: "service" as ComplaintCategory,
  severity: "medium" as ComplaintSeverity, subject: "", description: "",
};

export function ComplaintsView() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [summary, setSummary] = useState<ComplaintSummary | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  // Single "now" per render so every SLA badge agrees with the server's overdue tally.
  const now = new Date();

  const load = useCallback(async () => {
    const res = await fetch("/api/complaints");
    if (res.ok) {
      const j = await res.json();
      setComplaints(j.complaints);
      setSummary(j.summary);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const complete = draft.reporter.trim().length > 0 && draft.subject.trim().length > 0;

  const add = async () => {
    if (!complete) return;
    setBusy(true);
    const res = await fetch("/api/complaints", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reporter: draft.reporter, patientId: draft.patientId.trim() || null,
        category: draft.category, severity: draft.severity,
        subject: draft.subject, description: draft.description.trim() || null,
      }),
    });
    setBusy(false);
    if (res.ok) { setDraft(EMPTY); await load(); }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/complaints/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) await load();
  };

  const resolvedCount = (summary?.byStatus.resolved ?? 0) + (summary?.byStatus.closed ?? 0);

  return (
    <Can permission="ikp:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke modul komplain pasien.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Komplain Pasien</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Penanganan keluhan & grievance pasien dengan target SLA per tingkat keparahan — pendukung akreditasi KARS/PMKP.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total keluhan</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{summary?.total ?? "—"}</p>
          </Card>
          <Card className="p-4">
            <Badge variant="warning">Terbuka</Badge>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.byStatus.open ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Belum ditangani</p>
          </Card>
          <Card className="p-4">
            <Badge variant="danger">Lewat target</Badge>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.overdue ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Melewati SLA</p>
          </Card>
          <Card className="p-4">
            <Badge variant="success">Selesai</Badge>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary ? resolvedCount : "—"}</p>
            <p className="text-xs text-muted-foreground">Selesai / ditutup</p>
          </Card>
        </section>

        <Can permission="ikp:report">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-4 text-primary" /> Catat Keluhan
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <input className={inputCls} value={draft.reporter} placeholder="Pelapor (nama/relasi) *"
                onChange={(e) => setDraft((d) => ({ ...d, reporter: e.target.value }))} aria-label="Pelapor" />
              <input className={inputCls} value={draft.patientId} placeholder="No. RM pasien (opsional)"
                onChange={(e) => setDraft((d) => ({ ...d, patientId: e.target.value }))} aria-label="No. RM pasien" />
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Kategori</span>
                <select className={inputCls} value={draft.category} aria-label="Kategori"
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as ComplaintCategory }))}>
                  {COMPLAINT_CATEGORIES.map((c) => <option key={c} value={c}>{COMPLAINT_CATEGORY_LABEL[c]}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Tingkat keparahan</span>
                <select className={inputCls} value={draft.severity} aria-label="Tingkat keparahan"
                  onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value as ComplaintSeverity }))}>
                  {COMPLAINT_SEVERITIES.map((s) => (
                    <option key={s} value={s}>{COMPLAINT_SEVERITY_LABEL[s]} — target {SLA_TARGET_DAYS[s]} hari</option>
                  ))}
                </select>
              </label>
              <input className={`${inputCls} sm:col-span-2`} value={draft.subject} placeholder="Ringkasan keluhan *"
                onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} aria-label="Ringkasan keluhan" />
              <textarea className={`${inputCls} h-auto py-2 sm:col-span-2`} rows={2} value={draft.description} placeholder="Detail keluhan (opsional)"
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} aria-label="Detail keluhan" />
              <div className="flex justify-end sm:col-span-2">
                <Button onClick={add} disabled={busy || !complete}>
                  <Plus className="size-4" /> Simpan keluhan
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareWarning className="size-4 text-primary" /> Daftar Keluhan
            </CardTitle>
            <Badge variant="muted">{complaints.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {complaints.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada keluhan tercatat.</p>
            ) : (
              <ul className="divide-y divide-border">
                {complaints.map((c) => {
                  const sla = slaState(c.severity, c.createdAt, c.resolvedAt, now);
                  return (
                    <li key={c.id} className="flex flex-col gap-2 px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={COMPLAINT_SEVERITY_VARIANT[c.severity]}>{COMPLAINT_SEVERITY_LABEL[c.severity]}</Badge>
                        <span className="text-sm font-medium">{c.subject}</span>
                        <Badge variant="muted">{COMPLAINT_CATEGORY_LABEL[c.category]}</Badge>
                        <Badge variant={COMPLAINT_STATUS_VARIANT[c.status]}>{COMPLAINT_STATUS_LABEL[c.status]}</Badge>
                        <Badge variant={SLA_STATE_VARIANT[sla]}>{SLA_STATE_LABEL[sla]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pelapor: {c.reporter}
                        {c.patientId ? ` · RM ${c.patientId}` : ""}
                        {c.assignedTo ? ` · PIC: ${c.assignedTo}` : ""}
                      </p>
                      {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                      {c.resolution && <p className="text-xs text-foreground/80">Resolusi: {c.resolution}</p>}
                      <Can permission="ikp:manage">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            Status
                            <select className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                              value={c.status} aria-label={`Status ${c.subject}`}
                              onChange={(e) => patch(c.id, { status: e.target.value as ComplaintStatus })}>
                              {COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{COMPLAINT_STATUS_LABEL[s]}</option>)}
                            </select>
                          </label>
                          <input className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs"
                            placeholder="Tugaskan PIC" defaultValue={c.assignedTo ?? ""}
                            aria-label={`PIC ${c.subject}`}
                            onBlur={(e) => { const v = e.target.value.trim(); if (v !== (c.assignedTo ?? "")) patch(c.id, { assignedTo: v }); }} />
                          <input className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs"
                            placeholder="Catatan resolusi" defaultValue={c.resolution ?? ""}
                            aria-label={`Resolusi ${c.subject}`}
                            onBlur={(e) => { const v = e.target.value.trim(); if (v !== (c.resolution ?? "")) patch(c.id, { resolution: v }); }} />
                        </div>
                      </Can>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </Can>
  );
}

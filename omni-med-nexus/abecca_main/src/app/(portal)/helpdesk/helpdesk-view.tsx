"use client";

import { useCallback, useEffect, useState } from "react";
import { LifeBuoy, Plus } from "lucide-react";
import type { Ticket, TicketSummary } from "@/server/it/helpdesk";
import {
  TICKET_CATEGORIES, TICKET_CATEGORY_LABEL,
  TICKET_PRIORITIES, TICKET_PRIORITY_LABEL, TICKET_PRIORITY_VARIANT,
  TICKET_STATUSES, TICKET_STATUS_LABEL, TICKET_STATUS_VARIANT,
  RESPONSE_SLA_HOURS, RESPONSE_SLA_LABEL, RESPONSE_SLA_VARIANT,
  responseSla,
  type TicketCategory, type TicketPriority, type TicketStatus,
} from "@/lib/helpdesk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY = {
  reporter: "", category: "hardware" as TicketCategory, priority: "medium" as TicketPriority,
  subject: "", description: "",
};

export function HelpdeskView() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [summary, setSummary] = useState<TicketSummary | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  // One "now" per render so every SLA badge agrees with the server's overdue tally.
  const now = new Date();

  const load = useCallback(async () => {
    const res = await fetch("/api/helpdesk");
    if (res.ok) {
      const j = await res.json();
      setTickets(j.tickets);
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
    const res = await fetch("/api/helpdesk", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reporter: draft.reporter, category: draft.category, priority: draft.priority,
        subject: draft.subject, description: draft.description.trim() || null,
      }),
    });
    setBusy(false);
    if (res.ok) { setDraft(EMPTY); await load(); }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/helpdesk/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) await load();
  };

  const resolvedCount = (summary?.byStatus.resolved ?? 0) + (summary?.byStatus.closed ?? 0);

  return (
    <Can permission="device:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke helpdesk TI.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Helpdesk TI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tiket dukungan TI dengan target waktu respon (SLA) per prioritas — manajemen layanan TI.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <Badge variant="warning">Baru</Badge>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.byStatus.open ?? "—"}</p>
          </Card>
          <Card className="p-4">
            <Badge variant="info">Dikerjakan</Badge>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.byStatus.in_progress ?? "—"}</p>
          </Card>
          <Card className="p-4">
            <Badge variant="danger">Lewat respon</Badge>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.overdue ?? "—"}</p>
            <p className="text-[11px] text-muted-foreground">Belum direspon, lewat SLA</p>
          </Card>
          <Card className="p-4">
            <Badge variant="success">Selesai</Badge>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary ? resolvedCount : "—"}</p>
          </Card>
        </section>

        <Can permission="device:write">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-4 text-primary" /> Buat Tiket
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <input className={inputCls} value={draft.reporter} placeholder="Pelapor (nama/unit) *"
                onChange={(e) => setDraft((d) => ({ ...d, reporter: e.target.value }))} aria-label="Pelapor" />
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Kategori</span>
                <select className={inputCls} value={draft.category} aria-label="Kategori"
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as TicketCategory }))}>
                  {TICKET_CATEGORIES.map((c) => <option key={c} value={c}>{TICKET_CATEGORY_LABEL[c]}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Prioritas</span>
                <select className={inputCls} value={draft.priority} aria-label="Prioritas"
                  onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value as TicketPriority }))}>
                  {TICKET_PRIORITIES.map((p) => (
                    <option key={p} value={p}>{TICKET_PRIORITY_LABEL[p]} — respon {RESPONSE_SLA_HOURS[p]} jam</option>
                  ))}
                </select>
              </label>
              <input className={inputCls} value={draft.subject} placeholder="Ringkasan masalah *"
                onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} aria-label="Ringkasan masalah" />
              <textarea className={`${inputCls} h-auto py-2 sm:col-span-2`} rows={2} value={draft.description} placeholder="Detail masalah (opsional)"
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} aria-label="Detail masalah" />
              <div className="flex justify-end sm:col-span-2">
                <Button onClick={add} disabled={busy || !complete}>
                  <Plus className="size-4" /> Buat tiket
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="size-4 text-primary" /> Daftar Tiket
            </CardTitle>
            <Badge variant="muted">{tickets.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {tickets.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada tiket.</p>
            ) : (
              <ul className="divide-y divide-border">
                {tickets.map((t) => {
                  const sla = responseSla(t.priority, t.createdAt, t.firstResponseAt, now);
                  return (
                    <li key={t.id} className="flex flex-col gap-2 px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={TICKET_PRIORITY_VARIANT[t.priority]}>{TICKET_PRIORITY_LABEL[t.priority]}</Badge>
                        <span className="text-sm font-medium">{t.subject}</span>
                        <Badge variant="muted">{TICKET_CATEGORY_LABEL[t.category]}</Badge>
                        <Badge variant={TICKET_STATUS_VARIANT[t.status]}>{TICKET_STATUS_LABEL[t.status]}</Badge>
                        <Badge variant={RESPONSE_SLA_VARIANT[sla]}>{RESPONSE_SLA_LABEL[sla]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pelapor: {t.reporter}
                        {t.assignedTo ? ` · PIC: ${t.assignedTo}` : ""}
                      </p>
                      {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                      {t.resolution && <p className="text-xs text-foreground/80">Resolusi: {t.resolution}</p>}
                      <Can permission="device:write">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            Status
                            <select className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                              value={t.status} aria-label={`Status ${t.subject}`}
                              onChange={(e) => patch(t.id, { status: e.target.value as TicketStatus })}>
                              {TICKET_STATUSES.map((s) => <option key={s} value={s}>{TICKET_STATUS_LABEL[s]}</option>)}
                            </select>
                          </label>
                          <input className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs"
                            placeholder="Tugaskan PIC" defaultValue={t.assignedTo ?? ""}
                            aria-label={`PIC ${t.subject}`}
                            onBlur={(e) => { const v = e.target.value.trim(); if (v !== (t.assignedTo ?? "")) patch(t.id, { assignedTo: v }); }} />
                          <input className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs"
                            placeholder="Catatan resolusi" defaultValue={t.resolution ?? ""}
                            aria-label={`Resolusi ${t.subject}`}
                            onBlur={(e) => { const v = e.target.value.trim(); if (v !== (t.resolution ?? "")) patch(t.id, { resolution: v }); }} />
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

"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Plus, Trash2, Users } from "lucide-react";
import type { ShiftAssignment, RosterSummary } from "@/server/hr/rostering";
import {
  SHIFT_TYPES, SHIFT_TYPE_LABEL, SHIFT_TYPE_TIME, SHIFT_TYPE_VARIANT,
  type ShiftType,
} from "@/lib/rostering";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const today = () => new Date().toISOString().slice(0, 10);

export function RosterView() {
  const [start, setStart] = useState(today());
  const [shifts, setShifts] = useState<ShiftAssignment[]>([]);
  const [summary, setSummary] = useState<RosterSummary | null>(null);
  const [draft, setDraft] = useState({ staffName: "", unit: "", shiftType: "morning" as ShiftType, date: today(), notes: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/roster?from=${start}`);
    if (res.ok) {
      const j = await res.json();
      setShifts(j.shifts);
      setSummary(j.summary);
    }
  }, [start]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const add = async () => {
    if (!draft.staffName.trim() || !draft.unit.trim() || !draft.date) return;
    setBusy(true);
    setErr("");
    const res = await fetch("/api/roster", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...draft, notes: draft.notes.trim() || null }),
    });
    setBusy(false);
    if (res.ok) { setDraft((d) => ({ ...d, staffName: "", notes: "" })); await load(); }
    else { const j = await res.json().catch(() => ({})); setErr(j.error ?? "Gagal menambah shift"); }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/roster/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  };

  // Group the window's shifts by date for a day-by-day board.
  const byDate = new Map<string, ShiftAssignment[]>();
  for (const s of shifts) {
    const list = byDate.get(s.date) ?? [];
    list.push(s);
    byDate.set(s.date, list);
  }
  const dates = [...byDate.keys()].sort();

  return (
    <Can permission="user:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke jadwal jaga.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Jadwal Jaga</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Penjadwalan shift nakes per unit dengan beban kerja terukur (7 hari) — pencegahan double-booking.
            </p>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">Mulai dari</span>
            <input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} aria-label="Tanggal mulai" />
          </label>
        </div>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SHIFT_TYPES.map((t) => (
            <Card key={t} className="p-4">
              <Badge variant={SHIFT_TYPE_VARIANT[t]}>{SHIFT_TYPE_LABEL[t]}</Badge>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.byType[t] ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground">{SHIFT_TYPE_TIME[t]}</p>
            </Card>
          ))}
        </section>

        <Can permission="user:manage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-4 text-primary" /> Tambah Shift
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <input className={inputCls} value={draft.staffName} placeholder="Nama nakes *"
                onChange={(e) => setDraft((d) => ({ ...d, staffName: e.target.value }))} aria-label="Nama nakes" />
              <input className={inputCls} value={draft.unit} placeholder="Unit (mis. ICU) *"
                onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))} aria-label="Unit" />
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Jenis shift</span>
                <select className={inputCls} value={draft.shiftType} aria-label="Jenis shift"
                  onChange={(e) => setDraft((d) => ({ ...d, shiftType: e.target.value as ShiftType }))}>
                  {SHIFT_TYPES.map((t) => <option key={t} value={t}>{SHIFT_TYPE_LABEL[t]} ({SHIFT_TYPE_TIME[t]})</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Tanggal</span>
                <input type="date" className={inputCls} value={draft.date}
                  onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} aria-label="Tanggal shift" />
              </label>
              <input className={`${inputCls} sm:col-span-2`} value={draft.notes} placeholder="Catatan (opsional)"
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} aria-label="Catatan" />
              <div className="flex items-center justify-between sm:col-span-2">
                <span className="text-xs text-danger">{err}</span>
                <Button onClick={add} disabled={busy}><Plus className="size-4" /> Tambah</Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" /> Papan Jaga · 7 hari sejak {formatDate(start)}
            </CardTitle>
            <Badge variant="muted">{shifts.length} shift</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {dates.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Tidak ada shift pada rentang ini.</p>
            ) : (
              <ul className="divide-y divide-border">
                {dates.map((date) => (
                  <li key={date} className="px-5 py-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{formatDate(date)}</p>
                    <ul className="flex flex-col gap-1.5">
                      {byDate.get(date)!.map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center gap-2">
                          <Badge variant={SHIFT_TYPE_VARIANT[s.shiftType]}>{SHIFT_TYPE_LABEL[s.shiftType]}</Badge>
                          <span className="text-sm font-medium">{s.staffName}</span>
                          <span className="text-xs text-muted-foreground">· {s.unit}</span>
                          {s.notes && <span className="text-xs text-muted-foreground">· {s.notes}</span>}
                          <Can permission="user:manage">
                            <button type="button" onClick={() => remove(s.id)} aria-label={`Hapus shift ${s.staffName}`}
                              className="ml-auto grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger">
                              <Trash2 className="size-4" />
                            </button>
                          </Can>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-primary" /> Beban Kerja (7 hari)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!summary || summary.byStaff.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada beban kerja.</p>
            ) : (
              <ul className="divide-y divide-border">
                {summary.byStaff.map((s) => (
                  <li key={s.staffName} className="flex items-center justify-between px-5 py-2.5">
                    <span className="text-sm">{s.staffName}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.shifts} shift · <span className="font-semibold tabular-nums text-foreground">{s.hours} jam</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </Can>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Scissors } from "lucide-react";
import type { SurgeryBooking, SurgeryStatus } from "@/server/surgery/schedule";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const STATUS_LABEL: Record<SurgeryStatus, string> = {
  scheduled: "Terjadwal", in_progress: "Berlangsung", done: "Selesai", cancelled: "Batal",
};
const STATUS_VARIANT: Record<SurgeryStatus, "info" | "warning" | "success" | "danger"> = {
  scheduled: "info", in_progress: "warning", done: "success", cancelled: "danger",
};
const NEXT: Partial<Record<SurgeryStatus, { to: SurgeryStatus; label: string }[]>> = {
  scheduled: [{ to: "in_progress", label: "Mulai" }, { to: "cancelled", label: "Batal" }],
  in_progress: [{ to: "done", label: "Selesai" }],
};

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY = { patientId: "", procedure: "", surgeon: "", theatre: "", scheduledAt: "", notes: "" };

export function SurgeryView() {
  const [bookings, setBookings] = useState<SurgeryBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/surgery");
    setBookings(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const complete = draft.patientId.trim() && draft.procedure.trim() && draft.surgeon.trim() &&
    draft.theatre.trim() && draft.scheduledAt.trim();

  const book = async () => {
    if (!complete) return;
    setSaving(true);
    const res = await fetch("/api/surgery", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        patientId: draft.patientId.trim(),
        procedure: draft.procedure.trim(),
        surgeon: draft.surgeon.trim(),
        theatre: draft.theatre.trim(),
        scheduledAt: new Date(draft.scheduledAt).toISOString(),
        notes: draft.notes.trim() || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setDraft(EMPTY);
      await load();
    }
  };

  const advance = async (id: string, status: SurgeryStatus) => {
    const res = await fetch(`/api/surgery/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await load();
  };

  const upcoming = bookings.filter((b) => b.status === "scheduled" || b.status === "in_progress").length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Jadwal Operasi (OK)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Penjadwalan kamar operasi — prosedur, operator, ruang OK dan slot waktu.
        </p>
      </div>

      <Can permission="surgery:manage">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarPlus className="size-4 text-primary" /> Jadwalkan Operasi
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input className={inputCls} value={draft.patientId} placeholder="No. RM / pasien *"
              onChange={(e) => setDraft((d) => ({ ...d, patientId: e.target.value }))} aria-label="ID pasien" />
            <input className={inputCls} value={draft.procedure} placeholder="Prosedur *"
              onChange={(e) => setDraft((d) => ({ ...d, procedure: e.target.value }))} aria-label="Prosedur" />
            <input className={inputCls} value={draft.surgeon} placeholder="Operator / dokter bedah *"
              onChange={(e) => setDraft((d) => ({ ...d, surgeon: e.target.value }))} aria-label="Operator" />
            <input className={inputCls} value={draft.theatre} placeholder="Ruang OK *"
              onChange={(e) => setDraft((d) => ({ ...d, theatre: e.target.value }))} aria-label="Ruang OK" />
            <input className={inputCls} type="datetime-local" value={draft.scheduledAt}
              onChange={(e) => setDraft((d) => ({ ...d, scheduledAt: e.target.value }))} aria-label="Waktu" />
            <input className={inputCls} value={draft.notes} placeholder="Catatan (opsional)"
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} aria-label="Catatan" />
            <div className="sm:col-span-2 lg:col-span-3">
              <Button onClick={book} disabled={saving || !complete}>
                <CalendarPlus className="size-4" /> Jadwalkan
              </Button>
            </div>
          </CardContent>
        </Card>
      </Can>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="size-4 text-primary" /> Jadwal Operasi
          </CardTitle>
          <Badge variant={upcoming ? "warning" : "success"}>{upcoming} aktif</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Memuat…</p>
          ) : bookings.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada jadwal operasi.</p>
          ) : (
            <ul className="divide-y divide-border">
              {bookings.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{b.procedure}</span>
                      <Badge variant={STATUS_VARIANT[b.status]}>{STATUS_LABEL[b.status]}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(b.scheduledAt)} · {b.theatre} · {b.surgeon} · Pasien {b.patientId}
                      {b.notes ? ` · ${b.notes}` : ""}
                    </p>
                  </div>
                  <Can permission="surgery:manage">
                    <span className="flex gap-1.5">
                      {(NEXT[b.status] ?? []).map((a) => (
                        <Button key={a.to} size="sm"
                          variant={a.to === "cancelled" ? "ghost" : "outline"}
                          onClick={() => advance(b.id, a.to)}>
                          {a.label}
                        </Button>
                      ))}
                    </span>
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

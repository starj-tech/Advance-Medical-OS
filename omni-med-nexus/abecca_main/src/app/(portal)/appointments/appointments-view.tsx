"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CalendarPlus } from "lucide-react";
import type { Appointment, AppointmentStatus } from "@/server/scheduling/appointments";
import { POLYCLINICS } from "@/lib/polyclinics";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Terjadwal", checked_in: "Check-in", cancelled: "Batal", no_show: "Tidak hadir",
};
const STATUS_VARIANT: Record<AppointmentStatus, "info" | "success" | "danger" | "warning"> = {
  scheduled: "info", checked_in: "success", cancelled: "danger", no_show: "warning",
};
const NEXT: { to: AppointmentStatus; label: string; variant: "outline" | "ghost" }[] = [
  { to: "checked_in", label: "Check-in", variant: "outline" },
  { to: "no_show", label: "Tidak hadir", variant: "ghost" },
  { to: "cancelled", label: "Batal", variant: "ghost" },
];

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY = { patientId: "", polyclinic: POLYCLINICS[0] as string, practitioner: "", scheduledAt: "", notes: "" };

export function AppointmentsView() {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/appointments");
    setAppts(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const complete = draft.patientId.trim() && draft.polyclinic.trim() && draft.scheduledAt.trim();

  const book = async () => {
    if (!complete) return;
    setSaving(true);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        patientId: draft.patientId.trim(),
        polyclinic: draft.polyclinic,
        practitioner: draft.practitioner.trim() || null,
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

  const advance = async (id: string, status: AppointmentStatus) => {
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await load();
  };

  const upcoming = appts.filter((a) => a.status === "scheduled").length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Janji Temu (Appointment)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Penjadwalan kunjungan poliklinik. Saat pasien datang, check-in mendorongnya ke antrian hari ini.
        </p>
      </div>

      <Can permission="registration:write">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarPlus className="size-4 text-primary" /> Buat Janji Temu
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input className={inputCls} value={draft.patientId} placeholder="No. RM / pasien *"
              onChange={(e) => setDraft((d) => ({ ...d, patientId: e.target.value }))} aria-label="ID pasien" />
            <select className={inputCls} value={draft.polyclinic}
              onChange={(e) => setDraft((d) => ({ ...d, polyclinic: e.target.value }))} aria-label="Poliklinik">
              {POLYCLINICS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input className={inputCls} value={draft.practitioner} placeholder="Dokter (opsional)"
              onChange={(e) => setDraft((d) => ({ ...d, practitioner: e.target.value }))} aria-label="Dokter" />
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
            <CalendarClock className="size-4 text-primary" /> Daftar Janji Temu
          </CardTitle>
          <Badge variant={upcoming ? "info" : "muted"}>{upcoming} terjadwal</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Memuat…</p>
          ) : appts.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada janji temu.</p>
          ) : (
            <ul className="divide-y divide-border">
              {appts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{a.polyclinic}</span>
                      <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(a.scheduledAt)} · Pasien {a.patientId}
                      {a.practitioner ? ` · ${a.practitioner}` : ""}
                      {a.notes ? ` · ${a.notes}` : ""}
                    </p>
                  </div>
                  {a.status === "scheduled" && (
                    <Can permission="registration:write">
                      <span className="flex gap-1.5">
                        {NEXT.map((act) => (
                          <Button key={act.to} size="sm" variant={act.variant}
                            onClick={() => advance(a.id, act.to)}>
                            {act.label}
                          </Button>
                        ))}
                      </span>
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

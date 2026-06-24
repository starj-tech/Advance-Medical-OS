"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Video } from "lucide-react";
import {
  TELE_STATUS_LABEL,
  isJoinable,
  type TeleStatus,
} from "@/lib/telemedicine";
import type { TeleSession } from "@/server/clinical/telemedicine";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const STATUS_VARIANT: Record<TeleStatus, "muted" | "info" | "warning" | "success" | "danger"> = {
  scheduled: "muted",
  waiting: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "danger",
};

function defaultSchedule(): string {
  // Local datetime-local value rounded to the next quarter hour.
  const d = new Date(Date.now() + 15 * 60_000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TelemedicineView() {
  const [sessions, setSessions] = useState<TeleSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultSchedule());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/telemedicine/sessions");
    setSessions(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const create = async () => {
    setError(null);
    const res = await fetch("/api/telemedicine/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        patientId: patientId.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        note: note.trim() || undefined,
      }),
    });
    if (res.ok) {
      setPatientId("");
      setNote("");
      setScheduledAt(defaultSchedule());
      await load();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Gagal membuat sesi.");
    }
  };

  const setStatus = async (sessionId: string, status: TeleStatus) => {
    const res = await fetch("/api/telemedicine/sessions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, status }),
    });
    if (res.ok) await load();
  };

  const active = sessions.filter((s) => s.status !== "completed" && s.status !== "cancelled");

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Telemedicine</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kunjungan video jarak jauh: jadwalkan sesi, buka ruang tunggu, dan gabung ke ruang video.
          Ruang dihosting penyedia eksternal (atau Jitsi publik bila belum dikonfigurasi).
        </p>
      </div>

      <Can permission="telemedicine:manage">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-4 text-primary" /> Jadwalkan Sesi Video
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                ID Pasien
                <input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="PAT-123" className={`${inputCls} w-36`} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Jadwal
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
                Catatan (opsional)
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Keluhan / tujuan kunjungan" className={`${inputCls} min-w-48 w-full`} />
              </label>
              <Button onClick={create} disabled={!patientId.trim() || !scheduledAt}>
                Buat sesi
              </Button>
            </div>
            {error && <p className="mt-2 text-sm font-medium text-danger">{error}</p>}
          </CardContent>
        </Card>
      </Can>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="size-4 text-primary" /> Sesi Video
          </CardTitle>
          <Badge variant={active.length ? "info" : "muted"}>{active.length} aktif</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Memuat…</p>
          ) : sessions.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada sesi telemedicine.</p>
          ) : (
            <ul className="divide-y divide-border">
              {sessions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">Pasien {s.patientId}</span>
                      <Badge variant={STATUS_VARIANT[s.status]}>{TELE_STATUS_LABEL[s.status]}</Badge>
                      <span className="font-mono text-[11px] text-muted-foreground">{s.roomId}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(s.scheduledAt)}{s.note ? ` · ${s.note}` : ""}
                    </p>
                  </div>

                  {isJoinable(s.status) && (
                    <a
                      href={s.roomUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
                    >
                      <Video className="size-4" /> Gabung video
                    </a>
                  )}

                  <Can permission="telemedicine:manage">
                    <span className="flex items-center gap-1.5">
                      {s.status === "scheduled" && (
                        <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "waiting")}>
                          Buka ruang tunggu
                        </Button>
                      )}
                      {(s.status === "scheduled" || s.status === "waiting") && (
                        <Button size="sm" onClick={() => setStatus(s.id, "in_progress")}>
                          Mulai
                        </Button>
                      )}
                      {s.status === "in_progress" && (
                        <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "completed")}>
                          Selesai
                        </Button>
                      )}
                      {s.status !== "completed" && s.status !== "cancelled" && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(s.id, "cancelled")}>
                          Batal
                        </Button>
                      )}
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

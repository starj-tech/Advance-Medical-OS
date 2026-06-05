"use client";

import { useCallback, useEffect, useState } from "react";
import { Ticket, UserPlus } from "lucide-react";
import type { QueueStatus, QueueTicket } from "@/server/registration/queue";
import { POLYCLINICS } from "@/lib/polyclinics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const STATUS_LABEL: Record<QueueStatus, string> = {
  waiting: "Menunggu",
  called: "Dipanggil",
  in_service: "Dilayani",
  done: "Selesai",
  no_show: "Tidak hadir",
};
const STATUS_VARIANT: Record<QueueStatus, "muted" | "info" | "warning" | "success" | "danger"> = {
  waiting: "muted",
  called: "info",
  in_service: "warning",
  done: "success",
  no_show: "danger",
};
// The forward actions offered for each non-terminal status.
const NEXT: Partial<Record<QueueStatus, { to: QueueStatus; label: string }[]>> = {
  waiting: [{ to: "called", label: "Panggil" }, { to: "no_show", label: "Tidak hadir" }],
  called: [{ to: "in_service", label: "Layani" }, { to: "no_show", label: "Tidak hadir" }],
  in_service: [{ to: "done", label: "Selesai" }],
};

const inputCls =
  "h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

export function RegistrationView() {
  const [queue, setQueue] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState("");
  const [polyclinic, setPolyclinic] = useState<string>(POLYCLINICS[0]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/registration/queue");
    setQueue(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const register = async () => {
    if (!patientId.trim()) return;
    setBusy(true);
    const res = await fetch("/api/registration/queue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patientId: patientId.trim(), polyclinic }),
    });
    setBusy(false);
    if (res.ok) {
      setPatientId("");
      await load();
    }
  };

  const advance = async (id: string, status: QueueStatus) => {
    const res = await fetch(`/api/registration/queue/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await load();
  };

  const byClinic = POLYCLINICS.map((p) => ({
    clinic: p,
    tickets: queue.filter((t) => t.polyclinic === p),
  })).filter((g) => g.tickets.length > 0);

  const waitingCount = queue.filter((t) => t.status === "waiting").length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Pendaftaran & Antrian</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pendaftaran rawat jalan — membuka kunjungan (encounter) dan memberi nomor antrian per poliklinik hari ini.
        </p>
      </div>

      <Can permission="registration:write">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-4 text-primary" /> Daftarkan Kunjungan
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">No. Rekam Medis / Pasien</span>
              <input
                className={inputCls}
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="mis. PAT-101"
                aria-label="ID pasien"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Poliklinik</span>
              <select
                className={inputCls}
                value={polyclinic}
                onChange={(e) => setPolyclinic(e.target.value)}
                aria-label="Poliklinik"
              >
                {POLYCLINICS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <Button onClick={register} disabled={busy || !patientId.trim()}>
              <Ticket className="size-4" /> Ambil Antrian
            </Button>
          </CardContent>
        </Card>
      </Can>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="size-4 text-primary" /> Antrian Hari Ini
          </CardTitle>
          <Badge variant={waitingCount ? "warning" : "success"}>{waitingCount} menunggu</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Memuat…</p>
          ) : byClinic.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">
              Belum ada pendaftaran hari ini.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {byClinic.map((g) => (
                <div key={g.clinic} className="px-5 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.clinic} · {g.tickets.length}
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {g.tickets.map((t) => (
                      <li key={t.id} className="flex flex-wrap items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-semibold tabular-nums text-primary">
                          {t.queueNumber}
                        </span>
                        <span className="text-sm font-medium">{t.patientId}</span>
                        <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                        <Can permission="registration:write">
                          <span className="ml-auto flex gap-1.5">
                            {(NEXT[t.status] ?? []).map((a) => (
                              <Button
                                key={a.to}
                                size="sm"
                                variant={a.to === "no_show" ? "ghost" : "outline"}
                                onClick={() => advance(t.id, a.to)}
                              >
                                {a.label}
                              </Button>
                            ))}
                          </span>
                        </Can>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

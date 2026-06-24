"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Droplets, Plus, Wrench } from "lucide-react";
import type { HdMachine, HdSession, HdShift } from "@/server/clinical/hemodialysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const SHIFTS: HdShift[] = ["pagi", "siang", "sore"];
const SHIFT_LABEL: Record<HdShift, string> = { pagi: "Pagi", siang: "Siang", sore: "Sore" };
const STATUS_LABEL: Record<HdSession["status"], string> = {
  scheduled: "Terjadwal", completed: "Selesai", cancelled: "Batal",
};
const STATUS_VARIANT: Record<HdSession["status"], "info" | "success" | "danger"> = {
  scheduled: "info", completed: "success", cancelled: "danger",
};

const today = () => new Date().toISOString().slice(0, 10);

export function HdTab() {
  const [machines, setMachines] = useState<HdMachine[]>([]);
  const [sessions, setSessions] = useState<HdSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(today());
  const [machineName, setMachineName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [shift, setShift] = useState<HdShift>("pagi");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [mRes, sRes] = await Promise.all([
      fetch("/api/hd/machines"),
      fetch(`/api/hd/sessions?date=${date}`),
    ]);
    setMachines(mRes.ok ? await mRes.json() : []);
    setSessions(sRes.ok ? await sRes.json() : []);
    setLoading(false);
  }, [date]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const addMachine = async () => {
    const name = machineName.trim();
    if (!name) return;
    const res = await fetch("/api/hd/machines", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setMachineName("");
      await load();
    }
  };

  const toggleMachine = async (m: HdMachine) => {
    await fetch("/api/hd/machines", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        machineId: m.id,
        status: m.status === "active" ? "maintenance" : "active",
      }),
    });
    await load();
  };

  const schedule = async () => {
    setError(null);
    const res = await fetch("/api/hd/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        patientId: patientId.trim(),
        machineId: machineId || machines[0]?.id,
        date,
        shift,
      }),
    });
    if (res.ok) {
      setPatientId("");
      await load();
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Gagal menjadwalkan sesi");
    }
  };

  const setStatus = async (sessionId: string, status: HdSession["status"]) => {
    await fetch("/api/hd/sessions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, status }),
    });
    await load();
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="size-4 text-primary" /> Mesin Hemodialisa
          </CardTitle>
          <Badge variant="muted">{machines.length} mesin</Badge>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {machines.map((m) => (
              <span
                key={m.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
              >
                {m.name}
                <Badge variant={m.status === "active" ? "success" : "warning"}>
                  {m.status === "active" ? "Aktif" : "Maintenance"}
                </Badge>
                <Can permission="hd:manage">
                  <button
                    type="button"
                    onClick={() => toggleMachine(m)}
                    aria-label={`Ubah status ${m.name}`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Wrench className="size-3.5" />
                  </button>
                </Can>
              </span>
            ))}
            {machines.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">Belum ada mesin terdaftar.</p>
            )}
          </div>
          <Can permission="hd:manage">
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                placeholder="Nama mesin (mis. HD-03)"
                className={`${inputCls} w-48`}
                aria-label="Nama mesin"
              />
              <Button size="sm" variant="outline" onClick={addMachine} disabled={!machineName.trim()}>
                <Plus className="size-4" /> Tambah mesin
              </Button>
            </div>
          </Can>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" /> Jadwal Sesi
          </CardTitle>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || today())}
            className={inputCls}
            aria-label="Tanggal jadwal"
          />
        </CardHeader>
        <CardContent>
          <Can permission="hd:manage">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <input
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="ID Pasien"
                className={`${inputCls} w-36`}
                aria-label="ID pasien"
              />
              <select
                value={machineId || machines[0]?.id || ""}
                onChange={(e) => setMachineId(e.target.value)}
                className={inputCls}
                aria-label="Mesin"
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as HdShift)}
                className={inputCls}
                aria-label="Shift"
              >
                {SHIFTS.map((s) => (
                  <option key={s} value={s}>{SHIFT_LABEL[s]}</option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={schedule}
                disabled={!patientId.trim() || machines.length === 0}
              >
                <Plus className="size-4" /> Jadwalkan
              </Button>
              {error && <p className="text-xs font-medium text-danger">{error}</p>}
            </div>
          </Can>

          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Memuat…</p>
          ) : sessions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Tidak ada sesi pada tanggal ini.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {sessions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">Pasien {s.patientId}</span>
                      <Badge variant="muted">{SHIFT_LABEL[s.shift]}</Badge>
                      <Badge variant="info">{s.machineName}</Badge>
                      <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.date} · {s.durationHours} jam{s.note ? ` · ${s.note}` : ""}
                    </p>
                  </div>
                  {s.status === "scheduled" && (
                    <Can permission="hd:manage">
                      <span className="flex items-center gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "completed")}>
                          Selesai
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setStatus(s.id, "cancelled")}>
                          Batal
                        </Button>
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

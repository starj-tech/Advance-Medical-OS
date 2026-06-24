"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Syringe } from "lucide-react";
import { CHEMO_REGIMENS } from "@/lib/chemo-regimens";
import type { ChemoCourse } from "@/server/clinical/chemo";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const STATUS_LABEL: Record<ChemoCourse["status"], string> = {
  active: "Aktif", completed: "Selesai", stopped: "Dihentikan",
};
const STATUS_VARIANT: Record<ChemoCourse["status"], "info" | "success" | "danger"> = {
  active: "info", completed: "success", stopped: "danger",
};

const isOverdue = (c: ChemoCourse) =>
  c.status === "active" && !!c.nextDueAt && new Date(c.nextDueAt).getTime() < Date.now();

export function ChemoTab() {
  const [courses, setCourses] = useState<ChemoCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState("");
  const [regimenCode, setRegimenCode] = useState(CHEMO_REGIMENS[0]?.code ?? "");

  const load = useCallback(async () => {
    const res = await fetch("/api/chemo/courses");
    setCourses(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const startCourse = async () => {
    const res = await fetch("/api/chemo/courses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patientId: patientId.trim(), regimenCode }),
    });
    if (res.ok) {
      setPatientId("");
      await load();
    }
  };

  const act = async (courseId: string, action: "cycle" | "stop") => {
    const res = await fetch("/api/chemo/courses", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ courseId, action }),
    });
    if (res.ok) await load();
  };

  const selected = CHEMO_REGIMENS.find((r) => r.code === regimenCode);

  return (
    <div className="flex flex-col gap-6">
      <Can permission="chemo:manage">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-4 text-primary" /> Kursus Kemoterapi Baru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="ID Pasien"
                className={`${inputCls} w-36`}
                aria-label="ID pasien"
              />
              <select
                value={regimenCode}
                onChange={(e) => setRegimenCode(e.target.value)}
                className={`${inputCls} min-w-64 flex-1`}
                aria-label="Regimen"
              >
                {CHEMO_REGIMENS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name} — {r.indication}
                  </option>
                ))}
              </select>
              <Button size="sm" onClick={startCourse} disabled={!patientId.trim()}>
                Mulai kursus
              </Button>
            </div>
            {selected && (
              <p className="mt-2 text-xs text-muted-foreground">
                {selected.cycles} siklus terencana, interval {selected.intervalDays} hari.
                Katalog regimen bersifat ilustratif — protokol final mengikuti komite onkologi RS.
              </p>
            )}
          </CardContent>
        </Card>
      </Can>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Syringe className="size-4 text-primary" /> Kursus Berjalan
          </CardTitle>
          <Badge variant="muted">{courses.length} kursus</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Memuat…</p>
          ) : courses.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">
              Belum ada kursus kemoterapi.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {courses.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">Pasien {c.patientId}</span>
                      <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                      <Badge variant="muted">
                        Siklus {c.cyclesGiven}/{c.totalCycles}
                      </Badge>
                      {isOverdue(c) && <Badge variant="danger">Lewat jadwal</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.regimenName} · {c.indication}
                      {c.nextDueAt ? ` · siklus berikutnya ${formatDate(c.nextDueAt)}` : ""}
                      {c.lastCycleAt ? ` · terakhir ${formatDate(c.lastCycleAt)}` : ""}
                    </p>
                  </div>
                  {c.status === "active" && (
                    <Can permission="chemo:manage">
                      <span className="flex items-center gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => act(c.id, "cycle")}>
                          Catat siklus
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => act(c.id, "stop")}>
                          Hentikan
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

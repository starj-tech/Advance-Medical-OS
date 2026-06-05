"use client";

import { useCallback, useEffect, useState } from "react";
import { BedDouble, Building2, CircleCheck, LogIn, Plus } from "lucide-react";
import type { BedStatus, BoardWard } from "@/server/facility/beds";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const BED_STYLE: Record<BedStatus, string> = {
  available: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  occupied: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  cleaning: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  blocked: "border-border bg-muted text-muted-foreground",
};
const STATUS_LABEL: Record<BedStatus, string> = {
  available: "Tersedia",
  occupied: "Terisi",
  cleaning: "Pembersihan",
  blocked: "Diblokir",
};
const STATUSES = Object.keys(STATUS_LABEL) as BedStatus[];

export function BedBoardView() {
  const [board, setBoard] = useState<BoardWard[]>([]);
  const [loading, setLoading] = useState(true);
  const [wardName, setWardName] = useState("");
  const [wardClass, setWardClass] = useState("");
  const [bedWardId, setBedWardId] = useState("");
  const [bedLabel, setBedLabel] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [admitPatientId, setAdmitPatientId] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/beds");
    const data: BoardWard[] = res.ok ? await res.json() : [];
    setBoard(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Async load; state set after await (false positive for the rule).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const addWard = async () => {
    if (!wardName.trim()) return;
    const res = await fetch("/api/wards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: wardName, wardClass }),
    });
    if (res.ok) {
      setWardName("");
      setWardClass("");
      await load();
    }
  };

  const addBed = async () => {
    if (!bedWardId || !bedLabel.trim()) return;
    const res = await fetch("/api/beds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wardId: bedWardId, label: bedLabel }),
    });
    if (res.ok) {
      setBedLabel("");
      await load();
    }
  };

  const setStatus = async (bedId: string, status: BedStatus) => {
    const res = await fetch(`/api/beds/${bedId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await load();
  };

  const admit = async (bedId: string) => {
    if (!admitPatientId.trim()) return;
    const res = await fetch("/api/admissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patientId: admitPatientId.trim(), bedId }),
    });
    if (res.ok) {
      setAdmitPatientId("");
      setSelected(null);
      await load();
    }
  };

  const selectedBed = board.flatMap((w) => w.beds).find((b) => b.id === selected);

  const totals = board.reduce(
    (acc, w) => {
      acc.total += w.total;
      acc.occupied += w.occupied;
      acc.available += w.available;
      return acc;
    },
    { total: 0, occupied: 0, available: 0 },
  );
  const overallBor = totals.total ? Math.round((totals.occupied / totals.total) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Bed" value={totals.total} icon={BedDouble} />
        <StatCard label="Terisi" value={totals.occupied} icon={BedDouble} tone="danger" />
        <StatCard label="Tersedia" value={totals.available} icon={CircleCheck} tone="success" />
        <StatCard
          label="BOR"
          value={`${overallBor}%`}
          icon={Building2}
          tone={overallBor >= 85 ? "danger" : overallBor >= 60 ? "warning" : "success"}
          hint="Bed Occupancy Rate"
        />
      </div>

      <Can permission="bed:manage">
        <Card>
          <CardHeader>
            <CardTitle>Kelola Ward & Bed</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="flex items-center gap-2">
              <input
                value={wardName}
                onChange={(e) => setWardName(e.target.value)}
                placeholder="Nama ward"
                className={inputCls}
                aria-label="Nama ward"
              />
              <input
                value={wardClass}
                onChange={(e) => setWardClass(e.target.value)}
                placeholder="Kelas (opsional)"
                className={inputCls}
                aria-label="Kelas ward"
              />
              <Button size="sm" onClick={addWard}>
                <Plus className="size-4" /> Ward
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={bedWardId}
                onChange={(e) => setBedWardId(e.target.value)}
                className={inputCls}
                aria-label="Pilih ward"
              >
                <option value="">Pilih ward…</option>
                {board.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <input
                value={bedLabel}
                onChange={(e) => setBedLabel(e.target.value)}
                placeholder="Label bed (mis. 01)"
                className={inputCls}
                aria-label="Label bed"
              />
              <Button size="sm" variant="outline" onClick={addBed} disabled={!bedWardId}>
                <Plus className="size-4" /> Bed
              </Button>
            </div>
          </CardContent>
        </Card>
      </Can>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>
      ) : board.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Belum ada ward. Tambahkan ward dan bed untuk memulai papan okupansi.
        </p>
      ) : (
        board.map((w) => (
          <Card key={w.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {w.name}
                {w.wardClass && <Badge variant="muted">{w.wardClass}</Badge>}
                <Badge variant={w.bor >= 85 ? "danger" : w.bor >= 60 ? "warning" : "success"}>
                  BOR {w.bor}%
                </Badge>
                <span className="text-xs font-normal text-muted-foreground">
                  {w.occupied}/{w.total} terisi · {w.available} tersedia
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {w.beds.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada bed di ward ini.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {w.beds.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelected(selected === b.id ? null : b.id)}
                      title={STATUS_LABEL[b.status]}
                      className={`flex min-w-16 flex-col items-center rounded-lg border px-3 py-2 text-xs transition-colors ${BED_STYLE[b.status]} ${
                        selected === b.id ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <span className="font-semibold">{b.label}</span>
                      <span className="text-[10px]">{STATUS_LABEL[b.status]}</span>
                    </button>
                  ))}
                </div>
              )}

              {selected && w.beds.some((b) => b.id === selected) && (
                <Can permission="bed:manage">
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    {selectedBed?.status === "available" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">Admisi rawat inap ke bed {selectedBed.label}:</span>
                        <input
                          value={admitPatientId}
                          onChange={(e) => setAdmitPatientId(e.target.value)}
                          placeholder="No. RM / pasien"
                          className={inputCls}
                          aria-label="ID pasien admisi"
                        />
                        <Button size="sm" onClick={() => admit(selected)} disabled={!admitPatientId.trim()}>
                          <LogIn className="size-4" /> Admisi
                        </Button>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">Ubah status bed terpilih:</span>
                      {STATUSES.map((s) => (
                        <Button key={s} size="sm" variant="outline" onClick={() => setStatus(selected, s)}>
                          {STATUS_LABEL[s]}
                        </Button>
                      ))}
                    </div>
                  </div>
                </Can>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

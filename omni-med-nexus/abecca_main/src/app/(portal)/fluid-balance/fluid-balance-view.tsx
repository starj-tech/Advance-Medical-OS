"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Droplets, Plus, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import type { Patient } from "@/lib/types";
import type { FluidEntry, FluidSummary } from "@/server/clinical/fluid-balance";
import {
  INTAKE_TYPES, OUTPUT_TYPES, fluidTypeLabel, balanceStatus, BALANCE_LABEL, BALANCE_VARIANT,
  type FluidDirection,
} from "@/lib/fluid-balance";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

export function FluidBalanceView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [entries, setEntries] = useState<FluidEntry[]>([]);
  const [summary, setSummary] = useState<FluidSummary | null>(null);
  const [patientId, setPatientId] = useState("");
  const [direction, setDirection] = useState<FluidDirection>("intake");
  const [type, setType] = useState<string>(INTAKE_TYPES[0].v);
  const [volume, setVolume] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async (pid: string) => {
    const qs = pid ? `?patientId=${encodeURIComponent(pid)}` : "";
    const [pt, fb] = await Promise.all([fetch("/api/patients"), fetch(`/api/nursing/fluid-balance${qs}`)]);
    if (pt.ok) setPatients(await pt.json());
    if (fb.ok) { const j = await fb.json(); setEntries(j.entries); setSummary(j.summary); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(patientId);
  }, [load, patientId]);

  // Keep the type valid whenever the direction flips.
  const typeOpts = direction === "intake" ? INTAKE_TYPES : OUTPUT_TYPES;
  const setDir = (d: FluidDirection) => {
    setDirection(d);
    setType((d === "intake" ? INTAKE_TYPES : OUTPUT_TYPES)[0].v);
  };

  const patientName = patients.find((p) => p.id === patientId)?.name ?? "";
  const net = summary?.net ?? 0;
  const status = useMemo(() => balanceStatus(net), [net]);

  const submit = async () => {
    if (!patientId) { setErr("Pilih pasien dulu"); return; }
    const volumeMl = Number(volume);
    if (!Number.isInteger(volumeMl) || volumeMl <= 0) { setErr("Volume harus bilangan bulat > 0 (mL)"); return; }
    setBusy(true); setErr("");
    const res = await fetch("/api/nursing/fluid-balance", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ patientId, patientName, direction, type, volumeMl, note: note.trim() || null }),
    });
    setBusy(false);
    if (res.ok) { setVolume(""); setNote(""); await load(patientId); }
    else { const j = await res.json().catch(() => ({})); setErr(j.error ?? "Gagal menyimpan catatan"); }
  };

  return (
    <Can permission="nursing:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke balans cairan.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Balans Cairan (Intake / Output)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catat asupan & keluaran cairan pasien; balans = total intake − total output.
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle>Pasien</CardTitle></CardHeader>
          <CardContent>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">Pilih pasien (kosongkan = semua pasien)</span>
              <select className={inputCls} value={patientId} aria-label="Pasien"
                onChange={(e) => setPatientId(e.target.value)}>
                <option value="">— semua pasien —</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.ward}/{p.bed}</option>)}
              </select>
            </label>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard icon={<ArrowDownToLine className="size-4 text-emerald-600" />} label="Total intake (mL)" value={summary?.intake ?? 0} />
          <SummaryCard icon={<ArrowUpFromLine className="size-4 text-amber-600" />} label="Total output (mL)" value={summary?.output ?? 0} />
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <span className="grid size-9 place-items-center rounded-lg bg-muted"><Droplets className="size-4 text-sky-600" /></span>
              <span className="flex flex-col">
                <span className="text-lg font-semibold tabular-nums">{net > 0 ? `+${net}` : net} mL</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  Balans · <Badge variant={BALANCE_VARIANT[status]}>{BALANCE_LABEL[status]}</Badge>
                </span>
              </span>
            </CardContent>
          </Card>
        </div>

        <Can permission="nursing:write">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Droplets className="size-4 text-primary" /> Catat Cairan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Arah</span>
                <select className={inputCls} value={direction} aria-label="Arah"
                  onChange={(e) => setDir(e.target.value as FluidDirection)}>
                  <option value="intake">Intake (asupan)</option>
                  <option value="output">Output (keluaran)</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Jenis</span>
                <select className={inputCls} value={type} aria-label="Jenis cairan" onChange={(e) => setType(e.target.value)}>
                  {typeOpts.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
                </select>
              </label>
              <input type="number" min={1} className={inputCls} value={volume} placeholder="Volume (mL) *"
                onChange={(e) => setVolume(e.target.value)} aria-label="Volume" />
              <input className={inputCls} value={note} placeholder="Catatan (opsional)"
                onChange={(e) => setNote(e.target.value)} aria-label="Catatan" />
              <div className="flex items-center justify-between sm:col-span-2">
                <span className="text-xs text-danger">{err}</span>
                <Button onClick={submit} disabled={busy || !patientId || !volume}>
                  <Plus className="size-4" /> Catat
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Droplets className="size-4 text-primary" /> Riwayat Catatan</CardTitle>
            <Badge variant="muted">{entries.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {entries.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada catatan cairan.</p>
            ) : (
              <ul className="divide-y divide-border">
                {entries.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
                    <Badge variant={e.direction === "intake" ? "success" : "warning"}>
                      {e.direction === "intake" ? "Intake" : "Output"}
                    </Badge>
                    <span className="text-sm font-medium tabular-nums">{e.volumeMl} mL</span>
                    <span className="text-xs text-muted-foreground">{fluidTypeLabel(e.type)}</span>
                    {!patientId && <span className="text-xs text-muted-foreground">· {e.patientName}</span>}
                    {e.note && <span className="text-xs text-muted-foreground">· {e.note}</span>}
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatDate(e.recordedAt)}</span>
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

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <span className="grid size-9 place-items-center rounded-lg bg-muted">{icon}</span>
        <span className="flex flex-col">
          <span className="text-lg font-semibold tabular-nums">{value}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </span>
      </CardContent>
    </Card>
  );
}

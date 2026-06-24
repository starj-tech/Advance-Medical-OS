"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardSignature, Plus, CheckCircle2, Clock } from "lucide-react";
import type { Patient } from "@/lib/types";
import type { Handover, HandoverSummary } from "@/server/clinical/handovers";
import {
  SBAR_FIELDS, filledSections, isComplete, HANDOVER_STATUS_LABEL, HANDOVER_STATUS_VARIANT,
  HANDOVER_SHIFT_LABEL, type SbarParts, type HandoverShift,
} from "@/lib/sbar";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";
const areaCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY: SbarParts = { situation: "", background: "", assessment: "", recommendation: "" };
const SHIFTS: HandoverShift[] = ["morning", "afternoon", "night"];

export function HandoverView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [summary, setSummary] = useState<HandoverSummary | null>(null);
  const [patientId, setPatientId] = useState("");
  const [fromStaff, setFromStaff] = useState("");
  const [toStaff, setToStaff] = useState("");
  const [shift, setShift] = useState<HandoverShift>("morning");
  const [parts, setParts] = useState<SbarParts>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const [pt, hv] = await Promise.all([fetch("/api/patients"), fetch("/api/nursing/handovers")]);
    if (pt.ok) setPatients(await pt.json());
    if (hv.ok) { const j = await hv.json(); setHandovers(j.handovers); setSummary(j.summary); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const patientName = patients.find((p) => p.id === patientId)?.name ?? "";
  const filled = useMemo(() => filledSections(parts), [parts]);
  const complete = isComplete(parts);

  const submit = async () => {
    if (!patientId) { setErr("Pilih pasien dulu"); return; }
    if (!fromStaff.trim()) { setErr("Isi perawat pemberi handover"); return; }
    if (!complete) { setErr("Lengkapi keempat bagian SBAR"); return; }
    setBusy(true); setErr("");
    const res = await fetch("/api/nursing/handovers", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ patientId, patientName, fromStaff: fromStaff.trim(), toStaff: toStaff.trim() || null, shift, ...parts }),
    });
    setBusy(false);
    if (res.ok) { setParts(EMPTY); setToStaff(""); await load(); }
    else { const j = await res.json().catch(() => ({})); setErr(j.error ?? "Gagal menyimpan handover"); }
  };

  const acknowledge = async (id: string) => {
    setBusy(true);
    const res = await fetch(`/api/nursing/handovers/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "acknowledge" }),
    });
    setBusy(false);
    if (res.ok) await load();
  };

  return (
    <Can permission="nursing:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke serah-terima pasien.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Serah Terima Pasien (SBAR)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Komunikasi efektif antar shift/unit dgn kerangka SBAR — sasaran keselamatan pasien KARS (SKP 2).
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard icon={<ClipboardSignature className="size-4 text-primary" />} label="Total handover" value={summary?.total ?? 0} />
          <SummaryCard icon={<Clock className="size-4 text-amber-600" />} label="Menunggu konfirmasi" value={summary?.pending ?? 0} />
          <SummaryCard icon={<CheckCircle2 className="size-4 text-emerald-600" />} label="Diterima" value={summary?.acknowledged ?? 0} />
        </div>

        <Can permission="nursing:write">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardSignature className="size-4 text-primary" /> Handover Baru
                <Badge variant={complete ? "success" : "muted"}>{filled}/{SBAR_FIELDS.length} bagian</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Pasien *</span>
                  <select className={inputCls} value={patientId} aria-label="Pasien" onChange={(e) => setPatientId(e.target.value)}>
                    <option value="">— pilih —</option>
                    {patients.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.ward}/{p.bed}</option>)}
                  </select>
                </label>
                <input className={inputCls} value={fromStaff} placeholder="Pemberi (perawat) *"
                  onChange={(e) => setFromStaff(e.target.value)} aria-label="Pemberi handover" />
                <input className={inputCls} value={toStaff} placeholder="Penerima (opsional)"
                  onChange={(e) => setToStaff(e.target.value)} aria-label="Penerima handover" />
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Shift</span>
                  <select className={inputCls} value={shift} aria-label="Shift" onChange={(e) => setShift(e.target.value as HandoverShift)}>
                    {SHIFTS.map((s) => <option key={s} value={s}>{HANDOVER_SHIFT_LABEL[s]}</option>)}
                  </select>
                </label>
              </div>
              {SBAR_FIELDS.map((f) => (
                <label key={f.key} className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">{f.label} — {f.hint}</span>
                  <textarea className={areaCls} rows={2} value={parts[f.key]} aria-label={f.label}
                    onChange={(e) => setParts({ ...parts, [f.key]: e.target.value })} />
                </label>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-xs text-danger">{err}</span>
                <Button onClick={submit} disabled={busy || !patientId || !complete}>
                  <Plus className="size-4" /> Simpan Handover
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardSignature className="size-4 text-primary" /> Riwayat Handover</CardTitle>
            <Badge variant="muted">{handovers.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {handovers.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada handover.</p>
            ) : (
              <ul className="divide-y divide-border">
                {handovers.map((h) => (
                  <li key={h.id} className="flex flex-col gap-2 px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={HANDOVER_STATUS_VARIANT[h.status]}>{HANDOVER_STATUS_LABEL[h.status]}</Badge>
                      <span className="text-sm font-medium">{h.patientName}</span>
                      {h.shift && <Badge variant="info">{HANDOVER_SHIFT_LABEL[h.shift]}</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {h.fromStaff}{h.toStaff ? ` → ${h.toStaff}` : ""}
                      </span>
                      <span className="ml-auto flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                        {h.status === "pending" && (
                          <Can permission="nursing:write">
                            <Button size="sm" variant="outline" onClick={() => acknowledge(h.id)} disabled={busy}>Terima</Button>
                          </Can>
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">S:</span> {h.situation} · <span className="font-medium text-foreground">B:</span> {h.background} · <span className="font-medium text-foreground">A:</span> {h.assessment} · <span className="font-medium text-foreground">R:</span> {h.recommendation}
                    </p>
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

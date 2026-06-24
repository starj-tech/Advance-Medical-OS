"use client";

import { useCallback, useEffect, useState } from "react";
import { FileSignature, Plus, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import type { ConsentRecord, ConsentSummary } from "@/server/clinical/consent";
import {
  CONSENT_TYPES, CONSENT_TYPE_LABEL,
  CONSENT_STATUS_LABEL, CONSENT_STATUS_VARIANT,
  effectiveStatus, type ConsentType,
} from "@/lib/consent";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY = {
  patientId: "", consentType: "general_treatment" as ConsentType,
  grantor: "", relationship: "", scope: "", validUntil: "",
};

export function ConsentView() {
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [summary, setSummary] = useState<ConsentSummary | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const now = new Date();

  const load = useCallback(async () => {
    const res = await fetch("/api/consent");
    if (res.ok) {
      const j = await res.json();
      setRecords(j.consents);
      setSummary(j.summary);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const complete = draft.patientId.trim() && draft.grantor.trim();

  const add = async () => {
    if (!complete) return;
    setBusy(true);
    const res = await fetch("/api/consent", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...draft,
        relationship: draft.relationship.trim() || null,
        scope: draft.scope.trim() || null,
        validUntil: draft.validUntil || null,
      }),
    });
    setBusy(false);
    if (res.ok) { setDraft(EMPTY); await load(); }
  };

  const withdraw = async (id: string) => {
    if ((await fetch(`/api/consent/${id}`, { method: "PATCH" })).ok) await load();
  };

  return (
    <Can permission="patient:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke data persetujuan (consent).
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Manajemen Persetujuan (Informed Consent)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registri informed consent per pasien dgn status berlaku otomatis — pendukung UU PDP, GDPR, HIPAA & KARS.
          </p>
        </div>

        <section className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.byStatus.active ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Berlaku</p>
          </Card>
          <Card className="p-4">
            <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.byStatus.expired ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Kedaluwarsa</p>
          </Card>
          <Card className="p-4">
            <ShieldX className="size-4 text-rose-600 dark:text-rose-400" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.byStatus.withdrawn ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Dicabut</p>
          </Card>
        </section>

        <Can permission="patient:write">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="size-4 text-primary" /> Catat Persetujuan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input className={inputCls} value={draft.patientId} placeholder="No. RM pasien *"
                onChange={(e) => setDraft((d) => ({ ...d, patientId: e.target.value }))} aria-label="No. RM pasien" />
              <select className={inputCls} value={draft.consentType} aria-label="Jenis consent"
                onChange={(e) => setDraft((d) => ({ ...d, consentType: e.target.value as ConsentType }))}>
                {CONSENT_TYPES.map((t) => <option key={t} value={t}>{CONSENT_TYPE_LABEL[t]}</option>)}
              </select>
              <input className={inputCls} value={draft.grantor} placeholder="Pemberi consent (nama) *"
                onChange={(e) => setDraft((d) => ({ ...d, grantor: e.target.value }))} aria-label="Pemberi consent" />
              <input className={inputCls} value={draft.relationship} placeholder="Hubungan (pasien/wali)"
                onChange={(e) => setDraft((d) => ({ ...d, relationship: e.target.value }))} aria-label="Hubungan" />
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Berlaku s/d (opsional)</span>
                <input className={inputCls} type="date" value={draft.validUntil}
                  onChange={(e) => setDraft((d) => ({ ...d, validUntil: e.target.value }))} aria-label="Berlaku sampai" />
              </label>
              <input className={inputCls} value={draft.scope} placeholder="Cakupan / catatan"
                onChange={(e) => setDraft((d) => ({ ...d, scope: e.target.value }))} aria-label="Cakupan" />
              <div className="sm:col-span-2 lg:col-span-3">
                <Button onClick={add} disabled={busy || !complete}><Plus className="size-4" /> Simpan persetujuan</Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileSignature className="size-4 text-primary" /> Registri Persetujuan</CardTitle>
            <Badge variant="muted">{records.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {records.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada persetujuan tercatat.</p>
            ) : (
              <ul className="divide-y divide-border">
                {records.map((c) => {
                  const status = effectiveStatus(c, now);
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{CONSENT_TYPE_LABEL[c.consentType]}</span>
                          <Badge variant="muted">{c.patientId}</Badge>
                          <Badge variant={CONSENT_STATUS_VARIANT[status]}>{CONSENT_STATUS_LABEL[status]}</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.grantor}{c.relationship ? ` (${c.relationship})` : ""}
                          {c.validUntil ? ` · berlaku s/d ${formatDate(c.validUntil)}` : ""}
                          {c.scope ? ` · ${c.scope}` : ""}
                        </p>
                      </div>
                      {status === "active" && (
                        <Can permission="patient:write">
                          <Button size="sm" variant="ghost" onClick={() => withdraw(c.id)}>
                            <ShieldX className="size-4" /> Cabut
                          </Button>
                        </Can>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </Can>
  );
}

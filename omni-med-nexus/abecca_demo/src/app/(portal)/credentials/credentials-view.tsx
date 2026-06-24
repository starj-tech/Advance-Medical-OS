"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Plus, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import type { CredentialSummary, StaffCredential } from "@/server/hr/credentials";
import {
  CREDENTIAL_TYPES,
  CREDENTIAL_TYPE_LABEL,
  CREDENTIAL_STATUS_LABEL,
  CREDENTIAL_STATUS_VARIANT,
  credentialStatus,
  daysUntil,
  type CredentialType,
} from "@/lib/credentials";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY = {
  staffName: "", profession: "", credentialType: "STR" as CredentialType,
  number: "", issuedDate: "", expiryDate: "", notes: "",
};

export function CredentialsView() {
  const [creds, setCreds] = useState<StaffCredential[]>([]);
  const [summary, setSummary] = useState<CredentialSummary | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const now = new Date();

  const load = useCallback(async () => {
    const res = await fetch("/api/credentials");
    if (res.ok) {
      const j = await res.json();
      setCreds(j.credentials);
      setSummary(j.summary);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const complete = draft.staffName.trim() && draft.profession.trim() && draft.number.trim() && draft.expiryDate;

  const add = async () => {
    if (!complete) return;
    setBusy(true);
    const res = await fetch("/api/credentials", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...draft,
        issuedDate: draft.issuedDate || null,
        notes: draft.notes.trim() || null,
      }),
    });
    setBusy(false);
    if (res.ok) { setDraft(EMPTY); await load(); }
  };

  const remove = async (id: string) => {
    if ((await fetch(`/api/credentials/${id}`, { method: "DELETE" })).ok) await load();
  };

  return (
    <Can permission="user:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke kredensial nakes.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Kredensial Tenaga Kesehatan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registri STR/SIP dengan status berlaku otomatis dari tanggal kedaluwarsa — pendukung akreditasi KARS.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <BadgeCheck className="size-4 text-primary" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.total ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Total kredensial</p>
          </Card>
          <Card className="p-4">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.valid ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Berlaku</p>
          </Card>
          <Card className="p-4">
            <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.expiringSoon ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Segera kedaluwarsa (≤90 hari)</p>
          </Card>
          <Card className="p-4">
            <ShieldAlert className="size-4 text-rose-600 dark:text-rose-400" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.expired ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Kedaluwarsa</p>
          </Card>
        </section>

        <Can permission="user:manage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-4 text-primary" /> Tambah Kredensial
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input className={inputCls} value={draft.staffName} placeholder="Nama nakes *"
                onChange={(e) => setDraft((d) => ({ ...d, staffName: e.target.value }))} aria-label="Nama" />
              <input className={inputCls} value={draft.profession} placeholder="Profesi (mis. Dokter Umum) *"
                onChange={(e) => setDraft((d) => ({ ...d, profession: e.target.value }))} aria-label="Profesi" />
              <select className={inputCls} value={draft.credentialType}
                onChange={(e) => setDraft((d) => ({ ...d, credentialType: e.target.value as CredentialType }))}
                aria-label="Jenis kredensial">
                {CREDENTIAL_TYPES.map((t) => <option key={t} value={t}>{CREDENTIAL_TYPE_LABEL[t]}</option>)}
              </select>
              <input className={inputCls} value={draft.number} placeholder="Nomor kredensial *"
                onChange={(e) => setDraft((d) => ({ ...d, number: e.target.value }))} aria-label="Nomor" />
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Terbit (opsional)</span>
                <input className={inputCls} type="date" value={draft.issuedDate}
                  onChange={(e) => setDraft((d) => ({ ...d, issuedDate: e.target.value }))} aria-label="Tanggal terbit" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Kedaluwarsa *</span>
                <input className={inputCls} type="date" value={draft.expiryDate}
                  onChange={(e) => setDraft((d) => ({ ...d, expiryDate: e.target.value }))} aria-label="Tanggal kedaluwarsa" />
              </label>
              <div className="sm:col-span-2 lg:col-span-3">
                <Button onClick={add} disabled={busy || !complete}>
                  <Plus className="size-4" /> Simpan kredensial
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="size-4 text-primary" /> Registri Kredensial
            </CardTitle>
            <Badge variant="muted">{creds.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {creds.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada kredensial terdaftar.</p>
            ) : (
              <ul className="divide-y divide-border">
                {creds.map((c) => {
                  const status = credentialStatus(c.expiryDate, now);
                  const days = daysUntil(c.expiryDate, now);
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{c.staffName}</span>
                          <Badge variant="muted">{c.credentialType}</Badge>
                          <Badge variant={CREDENTIAL_STATUS_VARIANT[status]}>{CREDENTIAL_STATUS_LABEL[status]}</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.profession} · No. {c.number} · Kedaluwarsa {formatDate(c.expiryDate)}
                          {status === "expired" ? ` (lewat ${Math.abs(days)} hari)` : ` (${days} hari lagi)`}
                        </p>
                      </div>
                      <Can permission="user:manage">
                        <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>
                          <Trash2 className="size-4" /> Hapus
                        </Button>
                      </Can>
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

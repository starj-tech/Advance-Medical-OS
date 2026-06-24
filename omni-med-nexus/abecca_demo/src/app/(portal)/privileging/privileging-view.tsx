"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Stethoscope } from "lucide-react";
import type { Privilege, PrivilegeSummary } from "@/server/hr/privileging";
import {
  PRIVILEGE_CATEGORIES, PRIVILEGE_CATEGORY_LABEL,
  PRIVILEGE_STATUSES, PRIVILEGE_STATUS_LABEL, PRIVILEGE_STATUS_VARIANT,
  effectivePrivilegeStatus, daysUntilReview,
  type PrivilegeCategory, type PrivilegeStatus,
} from "@/lib/privileging";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY = {
  staffName: "", category: "medical" as PrivilegeCategory, privilege: "",
  status: "requested" as PrivilegeStatus, reviewBy: "", notes: "",
};

// Status actions only offer real transitions (expired is derived, not set directly).
const SETTABLE: PrivilegeStatus[] = ["requested", "granted", "suspended"];

export function PrivilegingView() {
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [summary, setSummary] = useState<PrivilegeSummary | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const now = new Date();

  const load = useCallback(async () => {
    const res = await fetch("/api/privileges");
    if (res.ok) {
      const j = await res.json();
      setPrivileges(j.privileges);
      setSummary(j.summary);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const complete = draft.staffName.trim().length > 0 && draft.privilege.trim().length > 0;

  const add = async () => {
    if (!complete) return;
    setBusy(true);
    const res = await fetch("/api/privileges", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        staffName: draft.staffName, category: draft.category, privilege: draft.privilege,
        status: draft.status, reviewBy: draft.reviewBy || null, notes: draft.notes.trim() || null,
      }),
    });
    setBusy(false);
    if (res.ok) { setDraft(EMPTY); await load(); }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/privileges/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) await load();
  };

  return (
    <Can permission="user:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke kewenangan klinis.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Kewenangan Klinis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rincian Kewenangan Klinis (RKK) — otorisasi tindakan per nakes oleh komite kredensial. Pendukung akreditasi KARS/KPS.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {PRIVILEGE_STATUSES.map((s) => (
            <Card key={s} className="p-4">
              <Badge variant={PRIVILEGE_STATUS_VARIANT[s]}>{PRIVILEGE_STATUS_LABEL[s]}</Badge>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.byStatus[s] ?? "—"}</p>
            </Card>
          ))}
        </section>

        <Can permission="user:manage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-4 text-primary" /> Ajukan Kewenangan
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <input className={inputCls} value={draft.staffName} placeholder="Nama nakes *"
                onChange={(e) => setDraft((d) => ({ ...d, staffName: e.target.value }))} aria-label="Nama nakes" />
              <select className={inputCls} value={draft.category} aria-label="Kategori"
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as PrivilegeCategory }))}>
                {PRIVILEGE_CATEGORIES.map((c) => <option key={c} value={c}>{PRIVILEGE_CATEGORY_LABEL[c]}</option>)}
              </select>
              <input className={`${inputCls} sm:col-span-2`} value={draft.privilege} placeholder="Kewenangan / tindakan (mis. Apendektomi) *"
                onChange={(e) => setDraft((d) => ({ ...d, privilege: e.target.value }))} aria-label="Kewenangan" />
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Status awal</span>
                <select className={inputCls} value={draft.status} aria-label="Status awal"
                  onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as PrivilegeStatus }))}>
                  {SETTABLE.map((s) => <option key={s} value={s}>{PRIVILEGE_STATUS_LABEL[s]}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Tinjauan ulang (opsional)</span>
                <input type="date" className={inputCls} value={draft.reviewBy}
                  onChange={(e) => setDraft((d) => ({ ...d, reviewBy: e.target.value }))} aria-label="Tanggal tinjauan ulang" />
              </label>
              <textarea className={`${inputCls} h-auto py-2 sm:col-span-2`} rows={2} value={draft.notes} placeholder="Catatan komite (opsional)"
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} aria-label="Catatan" />
              <div className="flex justify-end sm:col-span-2">
                <Button onClick={add} disabled={busy || !complete}>
                  <Plus className="size-4" /> Simpan kewenangan
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="size-4 text-primary" /> Daftar Kewenangan
            </CardTitle>
            <Badge variant="muted">{privileges.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {privileges.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada kewenangan terdaftar.</p>
            ) : (
              <ul className="divide-y divide-border">
                {privileges.map((p) => {
                  const eff = effectivePrivilegeStatus(p.status, p.reviewBy, now);
                  const days = daysUntilReview(p.reviewBy, now);
                  return (
                    <li key={p.id} className="flex flex-col gap-2 px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={PRIVILEGE_STATUS_VARIANT[eff]}>{PRIVILEGE_STATUS_LABEL[eff]}</Badge>
                        <span className="text-sm font-medium">{p.privilege}</span>
                        <Badge variant="muted">{PRIVILEGE_CATEGORY_LABEL[p.category]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.staffName}
                        {p.reviewBy ? ` · Tinjau ${p.reviewBy}${days != null && days >= 0 ? ` (${days} hari lagi)` : days != null ? " (lewat)" : ""}` : ""}
                      </p>
                      {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                      <Can permission="user:manage">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            Status
                            <select className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                              value={p.status} aria-label={`Status ${p.privilege}`}
                              onChange={(e) => patch(p.id, { status: e.target.value as PrivilegeStatus })}>
                              {SETTABLE.map((s) => <option key={s} value={s}>{PRIVILEGE_STATUS_LABEL[s]}</option>)}
                            </select>
                          </label>
                          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            Tinjau
                            <input type="date" className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                              defaultValue={p.reviewBy ?? ""} aria-label={`Tinjauan ${p.privilege}`}
                              onChange={(e) => patch(p.id, { reviewBy: e.target.value || null })} />
                          </label>
                        </div>
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

"use client";

import { useCallback, useEffect, useState } from "react";
import { Contact, Plus, Search } from "lucide-react";
import type { StaffMember, StaffSummary } from "@/server/hr/staff-directory";
import {
  STAFF_PROFESSIONS, STAFF_PROFESSION_LABEL,
  STAFF_STATUSES, STAFF_STATUS_LABEL, STAFF_STATUS_VARIANT,
  type StaffProfession, type StaffStatus,
} from "@/lib/staff-directory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY = {
  name: "", profession: "nurse" as StaffProfession, unit: "", phone: "", email: "", status: "active" as StaffStatus,
};

export function StaffView() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [summary, setSummary] = useState<StaffSummary | null>(null);
  const [filterProfession, setFilterProfession] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const sp = new URLSearchParams();
    if (filterProfession) sp.set("profession", filterProfession);
    if (filterStatus) sp.set("status", filterStatus);
    if (query.trim()) sp.set("q", query.trim());
    const res = await fetch(`/api/staff?${sp.toString()}`);
    if (res.ok) {
      const j = await res.json();
      setStaff(j.staff);
      setSummary(j.summary);
    }
  }, [filterProfession, filterStatus, query]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const add = async () => {
    if (!draft.name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/staff", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: draft.name, profession: draft.profession, unit: draft.unit.trim() || null,
        phone: draft.phone.trim() || null, email: draft.email.trim() || null, status: draft.status,
      }),
    });
    setBusy(false);
    if (res.ok) { setDraft(EMPTY); await load(); }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/staff/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) await load();
  };

  return (
    <Can permission="user:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke direktori staf.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Direktori Staf</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daftar seluruh personel rumah sakit — profesi, unit, kontak, & status kepegawaian. Pelengkap registri kredensial.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total staf</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{summary?.total ?? "—"}</p>
          </Card>
          {STAFF_STATUSES.map((s) => (
            <Card key={s} className="p-4">
              <Badge variant={STAFF_STATUS_VARIANT[s]}>{STAFF_STATUS_LABEL[s]}</Badge>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.byStatus[s] ?? "—"}</p>
            </Card>
          ))}
        </section>

        <Can permission="user:manage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-4 text-primary" /> Tambah Staf
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <input className={inputCls} value={draft.name} placeholder="Nama lengkap *"
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} aria-label="Nama" />
              <select className={inputCls} value={draft.profession} aria-label="Profesi"
                onChange={(e) => setDraft((d) => ({ ...d, profession: e.target.value as StaffProfession }))}>
                {STAFF_PROFESSIONS.map((p) => <option key={p} value={p}>{STAFF_PROFESSION_LABEL[p]}</option>)}
              </select>
              <input className={inputCls} value={draft.unit} placeholder="Unit / departemen"
                onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))} aria-label="Unit" />
              <select className={inputCls} value={draft.status} aria-label="Status"
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as StaffStatus }))}>
                {STAFF_STATUSES.map((s) => <option key={s} value={s}>{STAFF_STATUS_LABEL[s]}</option>)}
              </select>
              <input className={inputCls} value={draft.phone} placeholder="Telepon"
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} aria-label="Telepon" />
              <input className={inputCls} value={draft.email} placeholder="Email" type="email"
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} aria-label="Email" />
              <div className="flex justify-end sm:col-span-2">
                <Button onClick={add} disabled={busy || !draft.name.trim()}>
                  <Plus className="size-4" /> Simpan staf
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Contact className="size-4 text-primary" /> Direktori
            </CardTitle>
            <Badge variant="muted">{staff.length}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[12rem] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input className={`${inputCls} pl-8`} value={query} placeholder="Cari nama / unit / kontak…"
                  onChange={(e) => setQuery(e.target.value)} aria-label="Cari staf" />
              </div>
              <select className={`${inputCls} w-auto`} value={filterProfession} aria-label="Filter profesi"
                onChange={(e) => setFilterProfession(e.target.value)}>
                <option value="">Semua profesi</option>
                {STAFF_PROFESSIONS.map((p) => <option key={p} value={p}>{STAFF_PROFESSION_LABEL[p]}</option>)}
              </select>
              <select className={`${inputCls} w-auto`} value={filterStatus} aria-label="Filter status"
                onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Semua status</option>
                {STAFF_STATUSES.map((s) => <option key={s} value={s}>{STAFF_STATUS_LABEL[s]}</option>)}
              </select>
            </div>

            {staff.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada staf yang cocok.</p>
            ) : (
              <ul className="divide-y divide-border">
                {staff.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{s.name}</span>
                        <Badge variant="muted">{STAFF_PROFESSION_LABEL[s.profession]}</Badge>
                        <Badge variant={STAFF_STATUS_VARIANT[s.status]}>{STAFF_STATUS_LABEL[s.status]}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {s.unit ?? "—"}
                        {s.phone ? ` · ${s.phone}` : ""}
                        {s.email ? ` · ${s.email}` : ""}
                      </p>
                    </div>
                    <Can permission="user:manage">
                      <select className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                        value={s.status} aria-label={`Status ${s.name}`}
                        onChange={(e) => patch(s.id, { status: e.target.value as StaffStatus })}>
                        {STAFF_STATUSES.map((st) => <option key={st} value={st}>{STAFF_STATUS_LABEL[st]}</option>)}
                      </select>
                    </Can>
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

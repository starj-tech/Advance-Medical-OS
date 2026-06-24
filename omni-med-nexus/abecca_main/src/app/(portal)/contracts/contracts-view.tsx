"use client";

import { useCallback, useEffect, useState } from "react";
import { FileSignature, Handshake, Plus } from "lucide-react";
import type { Contract, ContractSummary } from "@/server/procurement/contracts";
import {
  CONTRACT_TYPES, CONTRACT_TYPE_LABEL,
  CONTRACT_STATUSES, CONTRACT_STATUS_LABEL, CONTRACT_STATUS_VARIANT,
  CONTRACT_EXPIRY_LABEL, CONTRACT_EXPIRY_VARIANT,
  contractExpiry, daysUntilEnd,
  type ContractType, type ContractStatus,
} from "@/lib/contracts";
import { formatIDR } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY = {
  vendor: "", title: "", type: "maintenance" as ContractType, value: "",
  startDate: "", endDate: "", notes: "",
};

export function ContractsView() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [summary, setSummary] = useState<ContractSummary | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const now = new Date();

  const load = useCallback(async () => {
    const res = await fetch("/api/contracts");
    if (res.ok) {
      const j = await res.json();
      setContracts(j.contracts);
      setSummary(j.summary);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const complete = draft.vendor.trim().length > 0 && draft.title.trim().length > 0;

  const add = async () => {
    if (!complete) return;
    setBusy(true);
    const res = await fetch("/api/contracts", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        vendor: draft.vendor, title: draft.title, type: draft.type,
        value: draft.value ? Number(draft.value) : 0,
        startDate: draft.startDate || null, endDate: draft.endDate || null,
        notes: draft.notes.trim() || null,
      }),
    });
    setBusy(false);
    if (res.ok) { setDraft(EMPTY); await load(); }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/contracts/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) await load();
  };

  return (
    <Can permission="procurement:read" fallback={
      <p className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke manajemen kontrak.
      </p>
    }>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Vendor & Kontrak</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registri kontrak vendor dengan pelacakan masa berlaku & perpanjangan — tata kelola pengadaan.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="p-4">
            <Badge variant="success">Aktif</Badge>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.byStatus.active ?? "—"}</p>
          </Card>
          <Card className="p-4">
            <Badge variant="warning">Segera berakhir</Badge>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.expiry.expiring_soon ?? "—"}</p>
            <p className="text-[11px] text-muted-foreground">≤60 hari</p>
          </Card>
          <Card className="p-4">
            <Badge variant="danger">Kedaluwarsa</Badge>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.expiry.expired ?? "—"}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Nilai kontrak aktif</p>
            <p className="mt-2 text-lg font-semibold tabular-nums">{summary ? formatIDR(summary.activeValue) : "—"}</p>
          </Card>
        </section>

        <Can permission="procurement:manage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-4 text-primary" /> Tambah Kontrak
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <input className={inputCls} value={draft.vendor} placeholder="Nama vendor *"
                onChange={(e) => setDraft((d) => ({ ...d, vendor: e.target.value }))} aria-label="Nama vendor" />
              <select className={inputCls} value={draft.type} aria-label="Jenis kontrak"
                onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as ContractType }))}>
                {CONTRACT_TYPES.map((t) => <option key={t} value={t}>{CONTRACT_TYPE_LABEL[t]}</option>)}
              </select>
              <input className={`${inputCls} sm:col-span-2`} value={draft.title} placeholder="Judul/cakupan kontrak *"
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} aria-label="Judul kontrak" />
              <input type="number" min={0} className={inputCls} value={draft.value} placeholder="Nilai kontrak (IDR)"
                onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))} aria-label="Nilai kontrak" />
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Mulai</span>
                  <input type="date" className={inputCls} value={draft.startDate}
                    onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))} aria-label="Tanggal mulai" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Berakhir</span>
                  <input type="date" className={inputCls} value={draft.endDate}
                    onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))} aria-label="Tanggal berakhir" />
                </label>
              </div>
              <div className="flex justify-end sm:col-span-2">
                <Button onClick={add} disabled={busy || !complete}>
                  <Plus className="size-4" /> Simpan kontrak
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="size-4 text-primary" /> Daftar Kontrak
            </CardTitle>
            <Badge variant="muted">{contracts.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {contracts.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada kontrak terdaftar.</p>
            ) : (
              <ul className="divide-y divide-border">
                {contracts.map((c) => {
                  const exp = c.status === "active" ? contractExpiry(c.endDate, now) : null;
                  const days = daysUntilEnd(c.endDate, now);
                  return (
                    <li key={c.id} className="flex flex-col gap-2 px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={CONTRACT_STATUS_VARIANT[c.status]}>{CONTRACT_STATUS_LABEL[c.status]}</Badge>
                        <span className="text-sm font-medium">{c.vendor}</span>
                        <Badge variant="muted">{CONTRACT_TYPE_LABEL[c.type]}</Badge>
                        {exp && <Badge variant={CONTRACT_EXPIRY_VARIANT[exp]}>{CONTRACT_EXPIRY_LABEL[exp]}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {c.title}
                        {c.value > 0 ? ` · ${formatIDR(c.value)}` : ""}
                        {c.endDate ? ` · s/d ${c.endDate}${days != null && days >= 0 ? ` (${days} hari lagi)` : days != null ? " (lewat)" : ""}` : " · tanpa batas akhir"}
                      </p>
                      {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}
                      <Can permission="procurement:manage">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            Status
                            <select className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                              value={c.status} aria-label={`Status ${c.vendor}`}
                              onChange={(e) => patch(c.id, { status: e.target.value as ContractStatus })}>
                              {CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{CONTRACT_STATUS_LABEL[s]}</option>)}
                            </select>
                          </label>
                          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <FileSignature className="size-3.5" /> Berakhir
                            <input type="date" className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                              defaultValue={c.endDate ?? ""} aria-label={`Tanggal berakhir ${c.vendor}`}
                              onChange={(e) => patch(c.id, { endDate: e.target.value || null })} />
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

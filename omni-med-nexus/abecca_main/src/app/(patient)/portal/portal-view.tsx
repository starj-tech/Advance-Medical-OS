"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, FileText, FlaskConical, LogOut, Receipt, Video } from "lucide-react";
import type { PortalSummary } from "@/server/portal/summary";
import { formatIDR, formatDateTime } from "@/lib/utils";
import { TELE_STATUS_LABEL, isJoinable } from "@/lib/telemedicine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const FLAG_VARIANT: Record<string, "success" | "warning" | "danger" | "muted"> = {
  normal: "success", abnormal: "warning", critical: "danger", unknown: "muted",
};
const FLAG_LABEL: Record<string, string> = {
  normal: "Normal", abnormal: "Abnormal", critical: "Kritis", unknown: "—",
};

export function PortalView() {
  const [summary, setSummary] = useState<PortalSummary | null>(null);
  const [checking, setChecking] = useState(true);
  const [companyCode, setCompanyCode] = useState("");
  const [patientId, setPatientId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/portal/summary");
    if (res.ok) setSummary(await res.json());
    else setSummary(null);
    setChecking(false);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSummary();
  }, [loadSummary]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/portal/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyCode: companyCode.trim(), patientId: patientId.trim(), code: code.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Login gagal. Periksa kembali data Anda.");
        return;
      }
      setCode("");
      await loadSummary();
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await fetch("/api/portal/session", { method: "DELETE" });
    setSummary(null);
    setCompanyCode("");
    setPatientId("");
  };

  if (checking) {
    return <p className="text-center text-sm text-muted-foreground">Memuat…</p>;
  }

  if (!summary) {
    return (
      <div className="mx-auto w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-base font-semibold tracking-tight">Masuk ke Portal Pasien</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Gunakan Company ID rumah sakit, No. Rekam Medis Anda, dan kode akses dari petugas.
        </p>
        <form onSubmit={signIn} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Company ID</span>
            <input value={companyCode} onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
              placeholder="mis. ABEC-7K2Q9F" className={`${inputCls} font-mono tracking-wide`} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">No. Rekam Medis</span>
            <input value={patientId} onChange={(e) => setPatientId(e.target.value)}
              placeholder="mis. PAT-204" className={inputCls} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Kode akses</span>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX" className={`${inputCls} font-mono tracking-wide`} required />
          </label>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="mt-1 w-full">
            {busy ? "Memproses…" : "Masuk"}
          </Button>
        </form>
      </div>
    );
  }

  const { patient, appointments, results, billing, resumes } = summary;

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Halo, {patient.name}</h1>
          <p className="text-xs text-muted-foreground">
            No. RM {patient.id}
            {patient.sex ? ` · ${patient.sex}` : ""}
            {patient.age != null ? ` · ${patient.age} thn` : ""}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={signOut}>
          <LogOut className="size-4" /> Keluar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4 text-primary" /> Janji Temu
          </CardTitle>
          <Badge variant={appointments.length ? "info" : "muted"}>{appointments.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {appointments.length === 0 ? (
            <p className="px-5 py-5 text-center text-sm text-muted-foreground">Tidak ada janji temu.</p>
          ) : (
            <ul className="divide-y divide-border">
              {appointments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{a.polyclinic}</span>
                      {a.modality === "telemedicine" && (
                        <Badge variant="info" className="gap-1">
                          <Video className="size-3" /> Telemedicine
                          {a.teleStatus ? ` · ${TELE_STATUS_LABEL[a.teleStatus]}` : ""}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(a.scheduledAt)}
                      {a.practitioner ? ` · ${a.practitioner}` : ""}
                    </p>
                  </div>
                  {a.modality === "telemedicine" && a.teleRoomUrl && a.teleStatus && isJoinable(a.teleStatus) && (
                    <a href={a.teleRoomUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <Video className="size-4" /> Gabung video
                      </Button>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="size-4 text-primary" /> Hasil Pemeriksaan (Tervalidasi)
          </CardTitle>
          <Badge variant={results.length ? "info" : "muted"}>{results.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {results.length === 0 ? (
            <p className="px-5 py-5 text-center text-sm text-muted-foreground">Belum ada hasil tervalidasi.</p>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{r.testName}</span>
                      {r.resultFlag && (
                        <Badge variant={FLAG_VARIANT[r.resultFlag] ?? "muted"}>
                          {FLAG_LABEL[r.resultFlag] ?? r.resultFlag}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.resultValue ? `Hasil: ${r.resultValue}` : r.impression ?? "—"}
                      {r.verifiedAt ? ` · ${formatDateTime(r.verifiedAt)}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-4 text-primary" /> Tagihan
          </CardTitle>
          <Badge variant={billing.balance > 0 ? "warning" : "success"}>
            {billing.balance > 0 ? "Ada tunggakan" : "Lunas"}
          </Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Total Tagihan</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatIDR(billing.totalCharges)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dibayar</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatIDR(billing.totalPaid)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sisa</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-primary">{formatIDR(billing.balance)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4 text-primary" /> Resume Medis
          </CardTitle>
          <Badge variant={resumes.length ? "info" : "muted"}>{resumes.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {resumes.length === 0 ? (
            <p className="px-5 py-5 text-center text-sm text-muted-foreground">Belum ada resume medis.</p>
          ) : (
            <ul className="divide-y divide-border">
              {resumes.map((r) => (
                <li key={r.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="muted">{r.condition}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm">{r.clinicalSummary}</p>
                  {r.followUp && (
                    <p className="mt-0.5 text-xs text-muted-foreground">Tindak lanjut: {r.followUp}</p>
                  )}
                  {r.dischargeMeds && (
                    <p className="mt-0.5 text-xs text-muted-foreground">Obat pulang: {r.dischargeMeds}</p>
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

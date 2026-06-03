"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROLE_TIERS, subRolesByTier } from "@/lib/rbac";

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const PLANS = [
  { value: "starter", label: "Starter" },
  { value: "professional", label: "Professional" },
  { value: "enterprise", label: "Enterprise" },
] as const;

type Employee = { fullName: string; email: string; subRole: string };

function SubRoleSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
      required
    >
      <option value="">Pilih jabatan…</option>
      {ROLE_TIERS.map((t) => (
        <optgroup key={t.tier} label={t.label}>
          {subRolesByTier(t.tier).map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

type Result = { companyCode: string; adminTempPassword: string; employeeCount: number };

export default function RegisterPage() {
  const [legalName, setLegalName] = useState("");
  const [hospitalClass, setHospitalClass] = useState("");
  const [plan, setPlan] = useState<(typeof PLANS)[number]["value"]>("starter");
  const [picEmail, setPicEmail] = useState("");

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminSubRole, setAdminSubRole] = useState("dir-utama");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const addEmployee = () =>
    setEmployees((es) => [...es, { fullName: "", email: "", subRole: "" }]);
  const removeEmployee = (i: number) =>
    setEmployees((es) => es.filter((_, idx) => idx !== i));
  const setEmployee = (i: number, patch: Partial<Employee>) =>
    setEmployees((es) => es.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          legalName: legalName.trim(),
          picEmail: picEmail.trim(),
          hospitalClass: hospitalClass.trim() || undefined,
          plan,
          admin: {
            fullName: adminName.trim(),
            email: adminEmail.trim(),
            subRole: adminSubRole,
          },
          employees: employees
            .filter((emp) => emp.fullName.trim() && emp.email.trim() && emp.subRole)
            .map((emp) => ({
              fullName: emp.fullName.trim(),
              email: emp.email.trim(),
              subRole: emp.subRole,
            })),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Pendaftaran gagal. Periksa kembali isian Anda.");
        return;
      }
      setResult({
        companyCode: j.companyCode,
        adminTempPassword: j.adminTempPassword,
        employeeCount: j.employeeCount,
      });
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-base font-semibold tracking-tight">Rumah sakit terdaftar 🎉</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Simpan kredensial berikut. Company ID dibagikan ke seluruh karyawan untuk login;
          password admin di bawah bersifat satu kali — segera ganti setelah masuk.
        </p>
        <dl className="mt-4 flex flex-col gap-3">
          <div className="rounded-lg border border-border bg-background p-3">
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Company ID</dt>
            <dd className="mt-1 font-mono text-lg font-semibold tracking-wide">{result.companyCode}</dd>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Password admin (sementara)
            </dt>
            <dd className="mt-1 font-mono text-lg font-semibold tracking-wide">
              {result.adminTempPassword}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          {result.employeeCount} karyawan ditambahkan (status diundang — akan diberi tautan untuk
          menyetel password sendiri).
        </p>
        <Link href="/login" className="mt-5 block">
          <Button className="w-full">Lanjut ke halaman masuk</Button>
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-2xl rounded-xl border border-border bg-surface p-6 shadow-sm"
    >
      <h1 className="text-base font-semibold tracking-tight">Daftarkan rumah sakit</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Buat tenant baru. Anda (PIC) menjadi admin perusahaan; tambahkan karyawan beserta jabatannya.
      </p>

      {/* Company */}
      <fieldset className="mt-5 rounded-lg border border-border p-4">
        <legend className="px-1 text-xs font-semibold text-muted-foreground">Data Rumah Sakit</legend>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Nama legal</span>
            <input value={legalName} onChange={(e) => setLegalName(e.target.value)} className={inputCls} placeholder="mis. RS Sehat Sentosa" required />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Kelas RS <span className="opacity-60">(opsional)</span></span>
              <input value={hospitalClass} onChange={(e) => setHospitalClass(e.target.value)} className={inputCls} placeholder="A / B / C / D" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Email PIC</span>
              <input type="email" value={picEmail} onChange={(e) => setPicEmail(e.target.value)} className={inputCls} placeholder="pic@rumahsakit.co.id" required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Paket</span>
              <select value={plan} onChange={(e) => setPlan(e.target.value as typeof plan)} className={inputCls}>
                {PLANS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </fieldset>

      {/* Admin / PIC */}
      <fieldset className="mt-4 rounded-lg border border-border p-4">
        <legend className="px-1 text-xs font-semibold text-muted-foreground">Admin Perusahaan (PIC)</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Nama lengkap</span>
            <input value={adminName} onChange={(e) => setAdminName(e.target.value)} className={inputCls} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Email</span>
            <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className={inputCls} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Jabatan</span>
            <SubRoleSelect value={adminSubRole} onChange={setAdminSubRole} />
          </label>
        </div>
      </fieldset>

      {/* Employees */}
      <fieldset className="mt-4 rounded-lg border border-border p-4">
        <legend className="px-1 text-xs font-semibold text-muted-foreground">Karyawan <span className="opacity-60">(opsional)</span></legend>
        <div className="flex flex-col gap-3">
          {employees.length === 0 && (
            <p className="text-xs text-muted-foreground">Belum ada karyawan. Anda bisa menambahkannya nanti.</p>
          )}
          {employees.map((emp, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <input value={emp.fullName} onChange={(e) => setEmployee(i, { fullName: e.target.value })} className={inputCls} placeholder="Nama" />
              <input type="email" value={emp.email} onChange={(e) => setEmployee(i, { email: e.target.value })} className={inputCls} placeholder="Email" />
              <SubRoleSelect value={emp.subRole} onChange={(v) => setEmployee(i, { subRole: v })} />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeEmployee(i)} className="sm:self-stretch">
                Hapus
              </Button>
            </div>
          ))}
          <div>
            <Button type="button" variant="outline" size="sm" onClick={addEmployee}>
              + Tambah karyawan
            </Button>
          </div>
        </div>
      </fieldset>

      {error && (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
          Sudah punya akun? Masuk
        </Link>
        <Button type="submit" disabled={loading}>
          {loading ? "Memproses…" : "Daftarkan rumah sakit"}
        </Button>
      </div>
    </form>
  );
}

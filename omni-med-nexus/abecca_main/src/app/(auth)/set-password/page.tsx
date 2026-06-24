"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

function SetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password minimal 8 karakter.");
    if (password !== confirm) return setError("Konfirmasi password tidak cocok.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Gagal menyetel password.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">Tautan undangan tidak lengkap.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
        <p className="text-sm">Password berhasil disetel. Mengarahkan ke halaman masuk…</p>
        <Link href="/login" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          Masuk sekarang
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h1 className="text-base font-semibold tracking-tight">Setel password Anda</h1>
      <p className="mt-1 text-xs text-muted-foreground">Buat password untuk mengaktifkan akun karyawan Anda.</p>
      <div className="mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Password baru</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} autoComplete="new-password" required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Konfirmasi password</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} autoComplete="new-password" required />
        </label>
        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>
        )}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Menyimpan…" : "Setel password"}
        </Button>
      </div>
    </form>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordForm />
    </Suspense>
  );
}

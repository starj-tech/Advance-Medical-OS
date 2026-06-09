"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

// Zero-config preview accounts (seeded in the in-memory auth store).
const DEMO_COMPANY = "ABECCA-DEMO";
const DEMO_PASSWORD = "AbeccaDemo123!";
const DEMO_ACCOUNTS = [
  { label: "Direktur Utama", email: "dirut@abecca.demo" },
  { label: "Dokter", email: "dokter@abecca.demo" },
  { label: "Ka. Farmasi", email: "farmasi@abecca.demo" },
];

export default function LoginPage() {
  const router = useRouter();
  const [companyCode, setCompanyCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fillDemo = (demoEmail: string) => {
    setCompanyCode(DEMO_COMPANY);
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyCode: companyCode.trim(), email: email.trim(), password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Login gagal. Periksa kembali kredensial Anda.");
        return;
      }
      // Honour ?next= if present, else go to the dashboard.
      const next =
        new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
      router.push(next);
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h1 className="text-base font-semibold tracking-tight">Masuk ke akun Anda</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Gunakan Company ID rumah sakit, email, dan password Anda.
      </p>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Company ID</span>
          <input
            value={companyCode}
            onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
            placeholder="mis. ABEC-7K2Q9F"
            autoComplete="organization"
            className={`${inputCls} font-mono tracking-wide`}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@rumahsakit.co.id"
            autoComplete="email"
            className={inputCls}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={inputCls}
            required
          />
        </label>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="mt-1 w-full">
          {loading ? "Memproses…" : "Masuk"}
        </Button>
      </form>

      <div className="mt-4 rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-xs font-semibold">Akun demo</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Company ID <span className="font-mono text-foreground">{DEMO_COMPANY}</span> · password{" "}
          <span className="font-mono text-foreground">{DEMO_PASSWORD}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DEMO_ACCOUNTS.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => fillDemo(d.email)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium transition-colors hover:border-primary hover:text-primary"
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Belum punya akun rumah sakit?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Daftarkan rumah sakit
        </Link>
      </p>
    </div>
  );
}

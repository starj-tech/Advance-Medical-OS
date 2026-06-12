"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-center font-mono text-lg tracking-[0.4em] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

type Status = { enabled: boolean; pending: boolean };

export function AccountView() {
  const [status, setStatus] = useState<Status | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/auth/mfa");
    setStatus(res.ok ? await res.json() : { enabled: false, pending: false });
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStatus();
  }, [loadStatus]);

  const onlyDigits = (v: string) => v.replace(/\D/g, "").slice(0, 6);

  const startSetup = async () => {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/auth/mfa", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "setup" }),
    });
    setBusy(false);
    if (res.ok) {
      const j = await res.json();
      setSecret(j.secret);
      setOtpauth(j.otpauthUrl);
      setCode("");
    } else {
      setError("Gagal memulai pendaftaran 2FA.");
    }
  };

  const act = async (action: "enable" | "disable") => {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/auth/mfa", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, code }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setSecret(null);
      setOtpauth(null);
      setCode("");
      await loadStatus();
    } else {
      setError(j.error ?? "Operasi gagal.");
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked; the key is shown for manual entry anyway.
    }
  };

  const enabled = status?.enabled ?? false;
  const setupOpen = secret !== null;

  return (
    <div className="flex max-w-2xl flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Lindungi akun Abecca Anda dengan verifikasi dua langkah (2FA) berbasis aplikasi
        authenticator. Identitas dipakai bersama aplikasi utama — mengaktifkan di sini juga
        berlaku saat masuk ke Abecca utama.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" /> Autentikasi Dua Faktor (TOTP)
          </CardTitle>
          <Badge variant={enabled ? "success" : "warning"}>
            {enabled ? "Aktif" : "Nonaktif"}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!status ? (
            <p className="text-sm text-muted-foreground">Memuat…</p>
          ) : enabled ? (
            <>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                2FA aktif. Anda akan diminta kode dari aplikasi authenticator setiap kali masuk.
              </p>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Masukkan kode untuk menonaktifkan
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(onlyDigits(e.target.value))}
                    placeholder="123456"
                    className={inputCls}
                    aria-label="Kode 2FA"
                  />
                  <Button
                    variant="outline"
                    disabled={busy || code.length !== 6}
                    onClick={() => act("disable")}
                  >
                    <ShieldOff className="size-4" /> Nonaktifkan
                  </Button>
                </div>
              </div>
            </>
          ) : setupOpen ? (
            <>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Buka aplikasi authenticator (Google Authenticator, Authy, 1Password…).</li>
                <li>Tambahkan akun baru lalu masukkan kunci di bawah secara manual.</li>
                <li>Masukkan 6 digit yang muncul untuk mengonfirmasi.</li>
              </ol>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">Kunci rahasia (base32)</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 break-all rounded bg-background px-2 py-1.5 font-mono text-sm">
                    {secret}
                  </code>
                  <Button variant="ghost" className="h-9 px-2" onClick={copySecret} aria-label="Salin kunci">
                    {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                  </Button>
                </div>
                <p className="mt-2 break-all text-[11px] text-muted-foreground">{otpauth}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Kode konfirmasi</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(onlyDigits(e.target.value))}
                    placeholder="123456"
                    className={inputCls}
                    aria-label="Kode konfirmasi 2FA"
                  />
                  <Button disabled={busy || code.length !== 6} onClick={() => act("enable")}>
                    Aktifkan
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                2FA belum aktif. Aktifkan untuk menambah lapisan keamanan saat login.
              </p>
              <div>
                <Button onClick={startSetup} disabled={busy}>
                  <KeyRound className="size-4" /> Aktifkan 2FA
                </Button>
              </div>
            </>
          )}

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

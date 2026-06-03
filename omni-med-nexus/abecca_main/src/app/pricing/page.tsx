import type { Metadata } from "next";
import Link from "next/link";
import { PLANS } from "@/server/billing/plans";

export const metadata: Metadata = {
  title: "Paket Berlangganan",
  description: "Pilih paket Abecca untuk rumah sakit Anda.",
};

function formatIdr(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-14 text-foreground">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Paket Abecca</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pilih paket sesuai skala rumah sakit Anda. Bayar, lalu Company ID dibuat otomatis.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col rounded-xl border border-border bg-surface p-6 shadow-sm"
            >
              <h2 className="text-base font-semibold tracking-tight">{plan.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>

              <div className="mt-4">
                {plan.monthlyIdr === null ? (
                  <span className="text-2xl font-semibold tracking-tight">Custom</span>
                ) : (
                  <>
                    <span className="text-2xl font-semibold tracking-tight">
                      {formatIdr(plan.monthlyIdr)}
                    </span>
                    <span className="text-xs text-muted-foreground"> / bulan</span>
                  </>
                )}
              </div>

              <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-foreground/90">
                    <span className="mt-0.5 text-primary">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.priceEnv ? (
                <Link
                  href={`/register?plan=${plan.id}`}
                  className="mt-6 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  Pilih {plan.name}
                </Link>
              ) : (
                <a
                  href="mailto:sales@abecca.health?subject=Abecca%20Enterprise"
                  className="mt-6 inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
                >
                  Hubungi Sales
                </a>
              )}
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </main>
  );
}

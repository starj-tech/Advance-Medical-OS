import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Status Pembayaran",
  robots: { index: false, follow: false },
};

/** Landing page after returning from Stripe Checkout. */
export default async function BillingReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const success = status === "success";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-xl ${
            success
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
              : "bg-amber-50 text-amber-600 dark:bg-amber-950/40"
          }`}
        >
          {success ? "✓" : "!"}
        </div>
        <h1 className="mt-4 text-base font-semibold tracking-tight">
          {success ? "Pembayaran berhasil" : "Pembayaran dibatalkan"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {success
            ? "Akun rumah sakit Anda sedang disiapkan. Company ID dan password admin dikirim ke email PIC. Setelah diterima, silakan masuk."
            : "Checkout dibatalkan. Anda dapat memilih paket kembali kapan saja."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {success ? (
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Ke halaman masuk
            </Link>
          ) : (
            <Link
              href="/pricing"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Lihat paket
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

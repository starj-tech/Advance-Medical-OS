import { Sparkles } from "lucide-react";

/**
 * Persistent "this is a demo" strip shown above every portal page. Frames the
 * app as a no-login try-before-you-buy experience and points to subscribing.
 */
export function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-primary px-4 py-1.5 text-center text-xs font-medium text-primary-foreground">
      <Sparkles className="size-3.5" />
      <span>
        Mode Demo Abecca — tanpa login. Semua data hanyalah contoh dan tersimpan
        sementara. Ganti <span className="font-semibold">Peran demo</span> di kanan atas untuk mencoba
        sudut pandang dokter, eksekutif, perawat, dan lainnya.
      </span>
      <a
        href="https://abeccamain.vercel.app"
        className="rounded-full bg-primary-foreground/15 px-2.5 py-0.5 font-semibold underline-offset-2 hover:bg-primary-foreground/25"
      >
        Berlangganan versi penuh →
      </a>
    </div>
  );
}

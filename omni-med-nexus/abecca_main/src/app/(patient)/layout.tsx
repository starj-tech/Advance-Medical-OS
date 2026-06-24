import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal Pasien",
  robots: { index: false, follow: false },
};

/** Branded, centered shell for the patient self-service portal — a surface
 *  separate from the staff app (no sidebar, its own access code login). */
export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-10 text-foreground">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
          A
        </div>
        <span className="text-lg font-semibold tracking-tight">Abecca · Portal Pasien</span>
        <span className="text-xs text-muted-foreground">Akses mandiri rekam, janji & tagihan Anda</span>
      </div>
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  );
}

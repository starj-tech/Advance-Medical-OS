import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk — Abecca IT",
  robots: { index: false, follow: false },
};

/** Branded, centered shell for the IT auth pages (outside the IT app shell). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
          A
        </div>
        <span className="text-lg font-semibold tracking-tight">Abecca IT</span>
        <span className="text-xs text-muted-foreground">Operasi & Keamanan TI Rumah Sakit</span>
      </div>
      {children}
    </div>
  );
}

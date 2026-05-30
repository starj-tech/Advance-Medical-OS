import Link from "next/link";
import { siteConfig } from "@/config/site";

export default function NotFound() {
  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-xs font-medium uppercase tracking-[0.3em] opacity-60">
        {siteConfig.name}
      </span>
      <h1 className="text-6xl font-bold tracking-tight">404</h1>
      <p className="max-w-md text-sm opacity-70">
        We couldn&apos;t find the page you were looking for.
      </p>
      <Link
        href="/"
        className="mt-2 rounded border border-foreground/15 px-5 py-2 text-sm font-medium transition-opacity hover:opacity-70"
      >
        Return home
      </Link>
    </main>
  );
}

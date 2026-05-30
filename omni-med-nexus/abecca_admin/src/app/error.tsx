"use client";

import { useEffect } from "react";
import { siteConfig } from "@/config/site";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to an error-reporting service (e.g. Sentry) in production.
    console.error(error);
  }, [error]);

  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-xs font-medium uppercase tracking-[0.3em] opacity-60">
        {siteConfig.name}
      </span>
      <h1 className="text-3xl font-bold tracking-tight">
        Something went wrong
      </h1>
      <p className="max-w-md text-sm opacity-70">
        An unexpected error occurred. Please try again — if the problem
        persists, contact your administrator.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs opacity-40">Ref: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded border border-foreground/15 px-5 py-2 text-sm font-medium transition-opacity hover:opacity-70"
      >
        Try again
      </button>
    </main>
  );
}

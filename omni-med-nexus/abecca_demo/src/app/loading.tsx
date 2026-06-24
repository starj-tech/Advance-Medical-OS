export default function Loading() {
  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-8">
      <div
        className="size-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/80"
        role="status"
        aria-label="Loading"
      />
      <span className="sr-only">Loading…</span>
    </main>
  );
}

import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { ensureDemoSeed } from "@/server/demo-seed";

export const metadata: Metadata = {
  title: "Coba Abecca — Demo",
};

// Render per-request so the in-memory demo seed runs in the live serverless
// process (not just at build time) and the dashboard/beds are populated.
export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Populate the in-memory demo tenant before any portal page renders.
  await ensureDemoSeed();
  return <AppShell>{children}</AppShell>;
}

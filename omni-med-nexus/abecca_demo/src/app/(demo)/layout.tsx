import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: "Demo & Training",
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}

import type { Metadata } from "next";
import { OverviewView } from "./overview-view";

export const metadata: Metadata = { title: "System Overview" };

export default function ItOverviewPage() {
  return <OverviewView />;
}

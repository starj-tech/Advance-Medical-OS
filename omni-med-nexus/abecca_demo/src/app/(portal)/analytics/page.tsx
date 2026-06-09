import type { Metadata } from "next";
import { AnalyticsView } from "./analytics-view";

export const metadata: Metadata = { title: "Analitik Eksekutif" };

export default function AnalyticsPage() {
  return <AnalyticsView />;
}

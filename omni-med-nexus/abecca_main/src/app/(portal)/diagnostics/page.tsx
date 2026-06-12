import type { Metadata } from "next";
import { DiagnosticsWorklistView } from "./diagnostics-view";

export const metadata: Metadata = { title: "Worklist Lab & Radiologi" };

export default function DiagnosticsPage() {
  return <DiagnosticsWorklistView />;
}

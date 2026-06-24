import type { Metadata } from "next";
import { CopilotView } from "./copilot-view";

export const metadata: Metadata = { title: "Abecca Copilot" };

export default function CopilotPage() {
  return <CopilotView />;
}

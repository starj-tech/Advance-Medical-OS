import type { Metadata } from "next";
import { FleetView } from "./fleet-view";

export const metadata: Metadata = { title: "Device Fleet" };

export default function FleetPage() {
  return <FleetView />;
}

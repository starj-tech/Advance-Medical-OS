import type { Metadata } from "next";
import { PharmacyView } from "./pharmacy-view";

export const metadata: Metadata = { title: "Dispensing Farmasi" };

export default function PharmacyPage() {
  return <PharmacyView />;
}

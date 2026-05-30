import type { Metadata } from "next";
import { WardsView } from "./wards-view";

export const metadata: Metadata = { title: "Wards & Beds" };

export default function WardsPage() {
  return <WardsView />;
}

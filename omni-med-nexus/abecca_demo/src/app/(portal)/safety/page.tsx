import type { Metadata } from "next";
import { SafetyView } from "./safety-view";

export const metadata: Metadata = { title: "Keselamatan Pasien" };

export default function SafetyPage() {
  return <SafetyView />;
}

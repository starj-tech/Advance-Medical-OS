import type { Metadata } from "next";
import { SurgeryView } from "./surgery-view";

export const metadata: Metadata = { title: "Jadwal Operasi" };

export default function SurgeryPage() {
  return <SurgeryView />;
}

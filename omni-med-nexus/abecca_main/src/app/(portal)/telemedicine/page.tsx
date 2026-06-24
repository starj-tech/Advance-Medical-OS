import type { Metadata } from "next";
import { TelemedicineView } from "./telemedicine-view";

export const metadata: Metadata = { title: "Telemedicine" };

export default function TelemedicinePage() {
  return <TelemedicineView />;
}

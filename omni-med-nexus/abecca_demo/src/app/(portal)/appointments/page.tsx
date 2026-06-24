import type { Metadata } from "next";
import { AppointmentsView } from "./appointments-view";

export const metadata: Metadata = { title: "Janji Temu" };

export default function AppointmentsPage() {
  return <AppointmentsView />;
}

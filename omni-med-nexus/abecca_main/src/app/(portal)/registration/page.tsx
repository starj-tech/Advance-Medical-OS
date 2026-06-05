import type { Metadata } from "next";
import { RegistrationView } from "./registration-view";

export const metadata: Metadata = { title: "Pendaftaran & Antrian" };

export default function RegistrationPage() {
  return <RegistrationView />;
}

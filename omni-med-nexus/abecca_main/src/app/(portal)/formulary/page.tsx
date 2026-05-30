import type { Metadata } from "next";
import { FormularyView } from "./formulary-view";

export const metadata: Metadata = { title: "Formulary" };

export default function FormularyPage() {
  return <FormularyView />;
}

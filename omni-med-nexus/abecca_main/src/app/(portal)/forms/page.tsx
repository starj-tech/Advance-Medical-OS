import type { Metadata } from "next";
import { FormsView } from "./forms-view";

export const metadata: Metadata = { title: "Form Builder" };

export default function FormsPage() {
  return <FormsView />;
}

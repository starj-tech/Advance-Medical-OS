import type { Metadata } from "next";
import { ScenariosView } from "./scenarios-view";

export const metadata: Metadata = { title: "Training Scenarios" };

export default function ScenariosPage() {
  return <ScenariosView />;
}

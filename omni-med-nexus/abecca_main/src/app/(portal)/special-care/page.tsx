import type { Metadata } from "next";
import { SpecialCareView } from "./special-care-view";

export const metadata: Metadata = { title: "Unit Khusus" };

export default function SpecialCarePage() {
  return <SpecialCareView />;
}

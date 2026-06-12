import type { Metadata } from "next";
import { ImagingView } from "./imaging-view";

export const metadata: Metadata = { title: "Imaging / PACS" };

export default function ImagingPage() {
  return <ImagingView />;
}

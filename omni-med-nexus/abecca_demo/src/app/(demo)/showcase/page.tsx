import type { Metadata } from "next";
import { ShowcaseView } from "./showcase-view";

export const metadata: Metadata = { title: "Feature Showcase" };

export default function ShowcasePage() {
  return <ShowcaseView />;
}

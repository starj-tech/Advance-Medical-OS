import type { Metadata } from "next";
import { BedBoardView } from "./bed-board-view";

export const metadata: Metadata = { title: "Bed Board" };

export default function BedsPage() {
  return <BedBoardView />;
}

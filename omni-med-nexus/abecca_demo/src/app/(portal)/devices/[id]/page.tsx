import type { Metadata } from "next";
import { DeviceDetail } from "./device-detail";

export const metadata: Metadata = { title: "Device" };

export default async function DevicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DeviceDetail id={decodeURIComponent(id)} />;
}

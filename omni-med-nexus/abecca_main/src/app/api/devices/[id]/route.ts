import { NextResponse } from "next/server";
import { getDevice, setDeviceStatus } from "@/server/devices";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const device = await getDevice(decodeURIComponent(id));
  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }
  return NextResponse.json(device);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json();
  const device = await setDeviceStatus(decodeURIComponent(id), body.status);
  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }
  return NextResponse.json(device);
}

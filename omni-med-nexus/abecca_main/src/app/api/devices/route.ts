import { NextResponse } from "next/server";
import { listDevices, upsertDevice } from "@/server/devices";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listDevices());
}

export async function POST(request: Request) {
  const body = await request.json();
  const device = await upsertDevice(body);
  return NextResponse.json(device, { status: 201 });
}

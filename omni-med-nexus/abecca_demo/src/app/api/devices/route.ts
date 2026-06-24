import { NextResponse } from "next/server";
import { listDevices, upsertDevice } from "@/server/devices";
import { requirePermission } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("device:read");
  if (guard.error) return guard.error;
  return NextResponse.json(await listDevices());
}

export async function POST(request: Request) {
  const guard = await requirePermission("device:write");
  if (guard.error) return guard.error;
  const body = await request.json();
  const device = await upsertDevice(body);
  return NextResponse.json(device, { status: 201 });
}

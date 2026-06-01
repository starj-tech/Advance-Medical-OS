import { NextResponse } from "next/server";
import { ingestReading, recentReadings } from "@/server/devices";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 100);
  return NextResponse.json(recentReadings(decodeURIComponent(id), limit));
}

/**
 * Ingest a reading for this device. Used by clients mirroring a Web Serial/BLE
 * stream into shared state, and by the on-prem gateway for legacy hardware.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const deviceId = decodeURIComponent(id);
  const body = await request.json();
  const reading = ingestReading({
    deviceId,
    kind: body.kind,
    ts: body.ts ?? new Date().toISOString(),
    status: body.status ?? "streaming",
    metrics: body.metrics ?? {},
  });
  return NextResponse.json(reading, { status: 201 });
}

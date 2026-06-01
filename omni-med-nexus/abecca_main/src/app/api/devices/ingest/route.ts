import { NextResponse } from "next/server";
import { ingestReading, upsertDevice } from "@/server/devices";
import type { DeviceReading } from "@/lib/types-devices";

export const dynamic = "force-dynamic";

/**
 * Batch ingest endpoint for the on-prem gateway agent.
 *
 * Legacy hospital hardware (RS-232, HL7 v2 over MLLP, DICOM, proprietary TCP)
 * cannot be reached by a browser or a Vercel server. The supported pattern is a
 * small agent running inside the hospital network that speaks those protocols,
 * normalises each device into our DeviceReading shape, and POSTs batches here.
 * In production this endpoint is protected by a gateway token (see
 * GATEWAY_INGEST_TOKEN) and the rows are persisted + fanned out via Supabase
 * Realtime so every connected client sees them live.
 */
export async function POST(request: Request) {
  // Optional shared-secret check (no-op if the env var is unset, e.g. preview).
  const expected = process.env.GATEWAY_INGEST_TOKEN;
  if (expected) {
    const got = request.headers.get("x-gateway-token");
    if (got !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await request.json();
  const readings: DeviceReading[] = Array.isArray(body) ? body : body.readings ?? [];
  let ingested = 0;
  for (const r of readings) {
    if (!r?.deviceId) continue;
    // Auto-register unknown devices the gateway reports.
    upsertDevice({
      id: r.deviceId,
      kind: r.kind,
      label: r.deviceId.split(":").slice(1).join(":") || r.deviceId,
      transport: "gateway",
      status: r.status ?? "streaming",
      lastSeen: r.ts ?? new Date().toISOString(),
    });
    ingestReading({
      deviceId: r.deviceId,
      kind: r.kind,
      ts: r.ts ?? new Date().toISOString(),
      status: r.status ?? "streaming",
      metrics: r.metrics ?? {},
    });
    ingested++;
  }
  return NextResponse.json({ ingested }, { status: 201 });
}

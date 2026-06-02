import { NextResponse } from "next/server";
import { createIncident, getIncidents } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getIncidents());
}

export async function POST(request: Request) {
  const body = await request.json();
  const incident = await createIncident(body.service, body.severity, body.title);
  return NextResponse.json(incident, { status: 201 });
}

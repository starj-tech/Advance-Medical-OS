import { NextResponse } from "next/server";
import { setIncidentStatus } from "@/server/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json();
  const inc = setIncidentStatus(id, body.status);
  if (!inc) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }
  return NextResponse.json(inc);
}

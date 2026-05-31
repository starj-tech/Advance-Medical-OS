import { NextResponse } from "next/server";
import { cycleServiceStatus, setServiceStatus } from "@/server/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json();
  const service =
    body.op === "cycle"
      ? cycleServiceStatus(id)
      : body.op === "set"
        ? setServiceStatus(id, body.status)
        : undefined;
  if (!service) {
    return NextResponse.json({ error: "Service not found or bad op" }, { status: 400 });
  }
  return NextResponse.json(service);
}

import { NextResponse } from "next/server";
import { toggleStaffDuty } from "@/server/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json();
  if (body.op !== "toggleDuty") {
    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  }
  const s = toggleStaffDuty(id);
  if (!s) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }
  return NextResponse.json(s);
}

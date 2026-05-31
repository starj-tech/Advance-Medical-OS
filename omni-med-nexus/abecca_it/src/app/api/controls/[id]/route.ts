import { NextResponse } from "next/server";
import { toggleControl } from "@/server/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json();
  if (body.op !== "toggle") {
    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  }
  const control = toggleControl(id);
  if (!control) {
    return NextResponse.json({ error: "Control not found" }, { status: 404 });
  }
  return NextResponse.json(control);
}

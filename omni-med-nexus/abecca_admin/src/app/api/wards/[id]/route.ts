import { NextResponse } from "next/server";
import { admitToWard, dischargeFromWard } from "@/server/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json();
  const ward =
    body.op === "admit"
      ? await admitToWard(id)
      : body.op === "discharge"
        ? await dischargeFromWard(id)
        : undefined;
  if (!ward) {
    return NextResponse.json({ error: "Ward not found or bad op" }, { status: 400 });
  }
  return NextResponse.json(ward);
}

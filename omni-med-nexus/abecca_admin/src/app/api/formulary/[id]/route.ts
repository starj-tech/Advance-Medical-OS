import { NextResponse } from "next/server";
import { restockMedication } from "@/server/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json();
  if (body.op !== "restock") {
    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  }
  const med = restockMedication(Number(id), Number(body.quantity));
  if (!med) {
    return NextResponse.json({ error: "Medication not found" }, { status: 404 });
  }
  return NextResponse.json(med);
}

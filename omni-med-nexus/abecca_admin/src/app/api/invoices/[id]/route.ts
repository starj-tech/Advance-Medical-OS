import { NextResponse } from "next/server";
import { setInvoiceStatus } from "@/server/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json();
  const inv = await setInvoiceStatus(id, body.status);
  if (!inv) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  return NextResponse.json(inv);
}

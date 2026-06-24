import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { restockMedication } from "@/server/db";

export const dynamic = "force-dynamic";

/** Replenish a formulary line. Pharmacy roles (formulary:dispense) manage stock. */
export async function POST(request: Request) {
  const guard = await requirePermission("formulary:dispense");
  if (guard.error) return guard.error;

  const body = await request.json();
  const formularyId = Number(body?.formularyId);
  if (!Number.isInteger(formularyId)) {
    return NextResponse.json({ error: "formularyId is required" }, { status: 400 });
  }
  const quantity = Number.isFinite(body?.quantity) ? Math.floor(body.quantity) : 0;
  if (quantity <= 0) {
    return NextResponse.json({ error: "quantity must be a positive integer" }, { status: 400 });
  }

  const med = await restockMedication(formularyId, quantity);
  if (!med) return NextResponse.json({ error: "Formulary item not found" }, { status: 404 });
  return NextResponse.json(med);
}

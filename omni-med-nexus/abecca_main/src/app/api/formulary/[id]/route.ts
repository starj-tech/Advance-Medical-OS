import { NextResponse } from "next/server";
import { dispenseToPatient, restockMedication } from "@/server/db";
import { requirePermission } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requirePermission("formulary:dispense");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const medId = Number(id);
  const body = await request.json();

  if (body.op === "restock") {
    const med = await restockMedication(medId, Number(body.quantity));
    if (!med) {
      return NextResponse.json({ error: "Medication not found" }, { status: 404 });
    }
    return NextResponse.json(med);
  }

  if (body.op === "dispense") {
    const { med } = await dispenseToPatient(
      String(body.patientId),
      medId,
      Number(body.quantity),
    );
    if (!med) {
      return NextResponse.json({ error: "Medication not found" }, { status: 404 });
    }
    return NextResponse.json({ med });
  }

  return NextResponse.json({ error: "Unknown op" }, { status: 400 });
}

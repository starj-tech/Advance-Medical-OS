import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import {
  createHdMachine,
  listHdMachines,
  setHdMachineStatus,
} from "@/server/clinical/hemodialysis";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("hd:read");
  if (guard.error) return guard.error;
  return NextResponse.json(await listHdMachines(guard.session.company.id));
}

export async function POST(request: Request) {
  const guard = await requirePermission("hd:manage");
  if (guard.error) return guard.error;
  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  return NextResponse.json(
    await createHdMachine(guard.session.company.id, name),
    { status: 201 },
  );
}

/** Toggle a machine between active and maintenance. */
export async function PATCH(request: Request) {
  const guard = await requirePermission("hd:manage");
  if (guard.error) return guard.error;
  const body = await request.json();
  const machineId = typeof body?.machineId === "string" ? body.machineId : "";
  const status = body?.status === "maintenance" ? "maintenance" : body?.status === "active" ? "active" : null;
  if (!machineId || !status) {
    return NextResponse.json({ error: "machineId and valid status are required" }, { status: 400 });
  }
  const machine = await setHdMachineStatus(guard.session.company.id, machineId, status);
  if (!machine) return NextResponse.json({ error: "Machine not found" }, { status: 404 });
  return NextResponse.json(machine);
}

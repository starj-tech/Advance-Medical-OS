import { NextResponse } from "next/server";
import { admitPatient, getPatients } from "@/server/db";
import { requirePermission } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("patient:read");
  if (guard.error) return guard.error;
  return NextResponse.json(await getPatients());
}

export async function POST(request: Request) {
  const guard = await requirePermission("patient:write");
  if (guard.error) return guard.error;
  const body = await request.json();
  const patient = await admitPatient(body);
  return NextResponse.json(patient, { status: 201 });
}

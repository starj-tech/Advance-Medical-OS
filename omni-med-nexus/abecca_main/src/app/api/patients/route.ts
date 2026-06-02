import { NextResponse } from "next/server";
import { admitPatient, getPatients } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getPatients());
}

export async function POST(request: Request) {
  const body = await request.json();
  const patient = await admitPatient(body);
  return NextResponse.json(patient, { status: 201 });
}

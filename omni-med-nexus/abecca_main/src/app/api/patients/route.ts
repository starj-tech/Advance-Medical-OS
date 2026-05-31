import { NextResponse } from "next/server";
import { admitPatient, getPatients } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getPatients());
}

export async function POST(request: Request) {
  const body = await request.json();
  const patient = admitPatient(body);
  return NextResponse.json(patient, { status: 201 });
}

import { NextResponse } from "next/server";
import {
  addDiagnosis,
  addNote,
  dischargePatient,
  getPatient,
  recordVitals,
  transferPatient,
} from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const patient = await getPatient(id);
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }
  return NextResponse.json(patient);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json();

  let patient;
  switch (body.op) {
    case "vitals":
      patient = await recordVitals(id, body.vitals);
      break;
    case "diagnosis":
      patient = await addDiagnosis(id, body.code);
      break;
    case "note":
      patient = await addNote(id, body.text);
      break;
    case "transfer":
      patient = await transferPatient(id, body.ward, body.bed);
      break;
    case "discharge":
      patient = await dischargePatient(id);
      break;
    default:
      return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  }

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }
  return NextResponse.json(patient);
}

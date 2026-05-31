import { NextResponse } from "next/server";
import { getIcd10 } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getIcd10());
}

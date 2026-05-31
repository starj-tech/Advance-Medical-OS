import { NextResponse } from "next/server";
import { getAudit } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getAudit());
}

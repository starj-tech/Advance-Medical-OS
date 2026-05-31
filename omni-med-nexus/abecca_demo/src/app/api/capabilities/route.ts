import { NextResponse } from "next/server";
import { getCapabilities } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getCapabilities());
}

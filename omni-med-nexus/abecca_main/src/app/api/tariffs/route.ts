import { NextResponse } from "next/server";
import { getTariffs } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getTariffs());
}

import { NextResponse } from "next/server";
import { getFormulary } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getFormulary());
}

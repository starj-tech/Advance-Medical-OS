import { NextResponse } from "next/server";
import { getDemoSession } from "@/server/auth/demo-session";

export const dynamic = "force-dynamic";

/** Demo app: no login — always returns the current demo persona's session. */
export async function GET() {
  return NextResponse.json(await getDemoSession());
}

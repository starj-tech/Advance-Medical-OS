import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { scribe } from "@/server/ai/copilot";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requirePermission("note:write");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";
  if (transcript.length < 10) {
    return NextResponse.json({ error: "transcript is too short" }, { status: 400 });
  }
  return NextResponse.json(await scribe(transcript));
}

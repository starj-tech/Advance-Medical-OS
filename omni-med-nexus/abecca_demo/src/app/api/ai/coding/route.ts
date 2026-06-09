import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { suggestCodes } from "@/server/ai/copilot";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requirePermission("diagnosis:read");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (text.length < 3) {
    return NextResponse.json({ error: "text is too short" }, { status: 400 });
  }
  return NextResponse.json(await suggestCodes(text));
}

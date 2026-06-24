import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { askData } from "@/server/ai/copilot";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requirePermission("analytics:read");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (question.length < 3) {
    return NextResponse.json({ error: "question is too short" }, { status: 400 });
  }
  return NextResponse.json(await askData(guard.session.company.id, question));
}

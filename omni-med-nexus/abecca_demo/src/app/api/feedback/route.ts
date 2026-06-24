import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createFeedback, listFeedback, feedbackSummary } from "@/server/quality/feedback";
import { isNpsScore, isCsatRating, isFeedbackSource } from "@/lib/feedback";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET() {
  const guard = await requirePermission("ikp:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const [feedback, summary] = await Promise.all([listFeedback(companyId), feedbackSummary(companyId)]);
  return NextResponse.json({ feedback, summary });
}

export async function POST(request: Request) {
  const guard = await requirePermission("ikp:report");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));

  if (!isFeedbackSource(body?.source)) return NextResponse.json({ error: "Sumber survei tidak valid" }, { status: 400 });
  if (!isNpsScore(body?.npsScore)) return NextResponse.json({ error: "Skor NPS harus bilangan bulat 0–10" }, { status: 400 });
  if (body?.csatRating !== undefined && body?.csatRating !== null && !isCsatRating(body.csatRating)) {
    return NextResponse.json({ error: "Penilaian CSAT harus 1–5" }, { status: 400 });
  }

  const f = await createFeedback(guard.session.company.id, {
    patientId: str(body?.patientId) || null, source: body.source, npsScore: body.npsScore,
    csatRating: body?.csatRating ?? null, comment: str(body?.comment) || null,
  });
  return NextResponse.json(f, { status: 201 });
}

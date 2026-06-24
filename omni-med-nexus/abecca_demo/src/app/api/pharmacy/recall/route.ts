import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { issueRecall, listRecalls, recallSummary } from "@/server/pharmacy/recall";
import { isValidLot } from "@/lib/recall";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET() {
  const guard = await requirePermission("formulary:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const [recalls, summary] = await Promise.all([listRecalls(companyId), recallSummary(companyId)]);
  return NextResponse.json({ recalls, summary });
}

export async function POST(request: Request) {
  const guard = await requirePermission("formulary:dispense");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const lotNo = str(body?.lotNo);
  const reason = str(body?.reason);
  if (!isValidLot(lotNo)) return NextResponse.json({ error: "Nomor lot/batch wajib diisi" }, { status: 400 });
  if (!reason) return NextResponse.json({ error: "Alasan penarikan wajib diisi" }, { status: 400 });

  const recall = await issueRecall(guard.session.company.id, {
    lotNo, reason, issuedBy: guard.session.user.id,
  });
  return NextResponse.json(recall, { status: 201 });
}

import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createComplaint, listComplaints, complaintSummary } from "@/server/quality/complaints";
import { isComplaintCategory, isComplaintSeverity } from "@/lib/complaints";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET() {
  const guard = await requirePermission("ikp:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const [items, summary] = await Promise.all([listComplaints(companyId), complaintSummary(companyId, new Date())]);
  return NextResponse.json({ complaints: items, summary });
}

export async function POST(request: Request) {
  const guard = await requirePermission("ikp:report");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const reporter = str(body?.reporter);
  const subject = str(body?.subject);
  if (!reporter || !subject) {
    return NextResponse.json({ error: "Pelapor dan ringkasan keluhan wajib diisi" }, { status: 400 });
  }
  if (!isComplaintCategory(body?.category)) return NextResponse.json({ error: "Kategori tidak valid" }, { status: 400 });
  if (!isComplaintSeverity(body?.severity)) return NextResponse.json({ error: "Tingkat keparahan tidak valid" }, { status: 400 });
  const c = await createComplaint(guard.session.company.id, {
    patientId: str(body?.patientId) || null, reporter, category: body.category, severity: body.severity,
    subject, description: str(body?.description) || null, createdBy: guard.session.user.id,
  });
  return NextResponse.json(c, { status: 201 });
}

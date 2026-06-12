import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createFormSubmission, listFormSubmissions } from "@/server/clinical/forms";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requirePermission("form:read");
  if (guard.error) return guard.error;
  const url = new URL(request.url);
  const templateId = url.searchParams.get("templateId") ?? undefined;
  const patientId = url.searchParams.get("patientId") ?? undefined;
  return NextResponse.json(
    await listFormSubmissions(guard.session.company.id, { templateId, patientId }),
  );
}

export async function POST(request: Request) {
  const guard = await requirePermission("form:submit");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const templateId = typeof body?.templateId === "string" ? body.templateId : "";
  if (!templateId) return NextResponse.json({ error: "templateId is required" }, { status: 400 });
  const result = await createFormSubmission(guard.session.company.id, templateId, {
    patientId: typeof body?.patientId === "string" ? body.patientId : "",
    encounterId: typeof body?.encounterId === "string" ? body.encounterId : null,
    answers: body?.answers && typeof body.answers === "object" ? body.answers : {},
    submittedBy: guard.session.user.id,
  });
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}

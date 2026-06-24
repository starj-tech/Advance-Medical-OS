import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import {
  createFormTemplate,
  listFormTemplates,
  setFormTemplateStatus,
} from "@/server/clinical/forms";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requirePermission("form:read");
  if (guard.error) return guard.error;
  const includeArchived = new URL(request.url).searchParams.get("all") === "1";
  return NextResponse.json(
    await listFormTemplates(guard.session.company.id, { includeArchived }),
  );
}

export async function POST(request: Request) {
  const guard = await requirePermission("form:manage");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const result = await createFormTemplate(guard.session.company.id, {
    name: typeof body?.name === "string" ? body.name : "",
    category: typeof body?.category === "string" ? body.category : undefined,
    fields: body?.fields,
    createdBy: guard.session.user.id,
  });
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}

/** Archive or re-activate a template: { templateId, status }. */
export async function PATCH(request: Request) {
  const guard = await requirePermission("form:manage");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const templateId = typeof body?.templateId === "string" ? body.templateId : "";
  const status = body?.status === "archived" ? "archived" : body?.status === "active" ? "active" : null;
  if (!templateId || !status) {
    return NextResponse.json({ error: "templateId and valid status are required" }, { status: 400 });
  }
  const template = await setFormTemplateStatus(guard.session.company.id, templateId, status);
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json(template);
}

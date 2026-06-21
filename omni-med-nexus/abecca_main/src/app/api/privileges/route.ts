import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createPrivilege, listPrivileges, privilegeSummary } from "@/server/hr/privileging";
import { isPrivilegeCategory, isPrivilegeStatus } from "@/lib/privileging";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET(request: Request) {
  const guard = await requirePermission("user:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const sp = new URL(request.url).searchParams;
  const status = sp.get("status");
  const category = sp.get("category");
  const [privileges, summary] = await Promise.all([
    listPrivileges(companyId, {
      status: isPrivilegeStatus(status) ? status : undefined,
      category: isPrivilegeCategory(category) ? category : undefined,
    }),
    privilegeSummary(companyId, new Date()),
  ]);
  return NextResponse.json({ privileges, summary });
}

export async function POST(request: Request) {
  const guard = await requirePermission("user:manage");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const staffName = str(body?.staffName);
  const privilege = str(body?.privilege);
  if (!staffName || !privilege) {
    return NextResponse.json({ error: "Nama staf dan kewenangan wajib diisi" }, { status: 400 });
  }
  if (!isPrivilegeCategory(body?.category)) return NextResponse.json({ error: "Kategori tidak valid" }, { status: 400 });
  if (body?.status !== undefined && !isPrivilegeStatus(body.status)) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }
  const reviewBy = str(body?.reviewBy);
  if (reviewBy && Number.isNaN(Date.parse(reviewBy))) {
    return NextResponse.json({ error: "Tanggal tinjauan tidak valid" }, { status: 400 });
  }
  const p = await createPrivilege(guard.session.company.id, {
    staffName, category: body.category, privilege,
    status: isPrivilegeStatus(body?.status) ? body.status : undefined,
    reviewBy: reviewBy || null, notes: str(body?.notes) || null,
  });
  return NextResponse.json(p, { status: 201 });
}

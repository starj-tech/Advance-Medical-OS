import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createStaff, listStaff, staffSummary } from "@/server/hr/staff-directory";
import { isStaffProfession, isStaffStatus } from "@/lib/staff-directory";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET(request: Request) {
  const guard = await requirePermission("user:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const sp = new URL(request.url).searchParams;
  const status = sp.get("status");
  const profession = sp.get("profession");
  const query = sp.get("q") ?? undefined;
  const [staff, summary] = await Promise.all([
    listStaff(companyId, {
      status: isStaffStatus(status) ? status : undefined,
      profession: isStaffProfession(profession) ? profession : undefined,
      query,
    }),
    staffSummary(companyId),
  ]);
  return NextResponse.json({ staff, summary });
}

export async function POST(request: Request) {
  const guard = await requirePermission("user:manage");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const name = str(body?.name);
  if (!name) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
  if (!isStaffProfession(body?.profession)) return NextResponse.json({ error: "Profesi tidak valid" }, { status: 400 });
  if (body?.status !== undefined && !isStaffStatus(body.status)) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }
  const s = await createStaff(guard.session.company.id, {
    name, profession: body.profession, unit: str(body?.unit) || null,
    phone: str(body?.phone) || null, email: str(body?.email) || null,
    status: isStaffStatus(body?.status) ? body.status : undefined,
  });
  return NextResponse.json(s, { status: 201 });
}

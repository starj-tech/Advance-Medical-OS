import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createContract, listContracts, contractSummary } from "@/server/procurement/contracts";
import { isContractStatus, isContractType } from "@/lib/contracts";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const dateOrNull = (v: unknown): string | null => (DATE_RE.test(str(v)) ? str(v) : null);

export async function GET(request: Request) {
  const guard = await requirePermission("procurement:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const sp = new URL(request.url).searchParams;
  const status = sp.get("status");
  const type = sp.get("type");
  const [contracts, summary] = await Promise.all([
    listContracts(companyId, {
      status: isContractStatus(status) ? status : undefined,
      type: isContractType(type) ? type : undefined,
    }),
    contractSummary(companyId, new Date()),
  ]);
  return NextResponse.json({ contracts, summary });
}

export async function POST(request: Request) {
  const guard = await requirePermission("procurement:manage");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const vendor = str(body?.vendor);
  const title = str(body?.title);
  if (!vendor || !title) return NextResponse.json({ error: "Vendor dan judul kontrak wajib diisi" }, { status: 400 });
  if (!isContractType(body?.type)) return NextResponse.json({ error: "Jenis kontrak tidak valid" }, { status: 400 });
  const value = Number(body?.value);
  const c = await createContract(guard.session.company.id, {
    vendor, title, type: body.type, value: Number.isFinite(value) ? value : 0,
    startDate: dateOrNull(body?.startDate), endDate: dateOrNull(body?.endDate),
    notes: str(body?.notes) || null,
  });
  return NextResponse.json(c, { status: 201 });
}

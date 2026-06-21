import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createAsset, listAssets, assetSummary } from "@/server/biomedical/assets";
import { isAssetCategory, isAssetStatus } from "@/lib/biomedical";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const dateOrNull = (v: unknown): string | null => (DATE_RE.test(str(v)) ? str(v) : null);

export async function GET(request: Request) {
  const guard = await requirePermission("device:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const sp = new URL(request.url).searchParams;
  const status = sp.get("status");
  const category = sp.get("category");
  const [assets, summary] = await Promise.all([
    listAssets(companyId, {
      status: isAssetStatus(status) ? status : undefined,
      category: isAssetCategory(category) ? category : undefined,
    }),
    assetSummary(companyId, new Date()),
  ]);
  return NextResponse.json({ assets, summary });
}

export async function POST(request: Request) {
  const guard = await requirePermission("device:write");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const name = str(body?.name);
  const location = str(body?.location);
  if (!name || !location) return NextResponse.json({ error: "Nama alat dan lokasi wajib diisi" }, { status: 400 });
  if (!isAssetCategory(body?.category)) return NextResponse.json({ error: "Kategori tidak valid" }, { status: 400 });
  if (body?.status !== undefined && !isAssetStatus(body.status)) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }
  const a = await createAsset(guard.session.company.id, {
    name, category: body.category, location, serialNo: str(body?.serialNo) || null,
    status: isAssetStatus(body?.status) ? body.status : undefined,
    lastMaintenance: dateOrNull(body?.lastMaintenance), nextDue: dateOrNull(body?.nextDue),
    notes: str(body?.notes) || null,
  });
  return NextResponse.json(a, { status: 201 });
}

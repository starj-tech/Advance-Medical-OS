import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createCredential, listCredentials, summarizeCredentials } from "@/server/hr/credentials";
import { isCredentialType } from "@/lib/credentials";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET() {
  const guard = await requirePermission("user:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const [credentials, summary] = await Promise.all([
    listCredentials(companyId),
    summarizeCredentials(companyId, new Date()),
  ]);
  return NextResponse.json({ credentials, summary });
}

export async function POST(request: Request) {
  const guard = await requirePermission("user:manage");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const staffName = str(body?.staffName);
  const profession = str(body?.profession);
  const number = str(body?.number);
  const expiryDate = str(body?.expiryDate);
  if (!staffName || !profession || !number || !expiryDate) {
    return NextResponse.json({ error: "Nama, profesi, nomor, dan tanggal kedaluwarsa wajib diisi" }, { status: 400 });
  }
  if (!isCredentialType(body?.credentialType)) {
    return NextResponse.json({ error: "Jenis kredensial tidak valid" }, { status: 400 });
  }
  if (Number.isNaN(Date.parse(expiryDate))) {
    return NextResponse.json({ error: "Tanggal kedaluwarsa tidak valid" }, { status: 400 });
  }
  const cred = await createCredential(guard.session.company.id, {
    staffName, profession, credentialType: body.credentialType, number, expiryDate,
    issuedDate: str(body?.issuedDate) || null, notes: str(body?.notes) || null,
    createdBy: guard.session.user.id,
  });
  return NextResponse.json(cred, { status: 201 });
}

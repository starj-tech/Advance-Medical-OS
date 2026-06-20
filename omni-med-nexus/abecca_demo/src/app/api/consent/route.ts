import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { recordConsent, listConsents, consentSummary } from "@/server/clinical/consent";
import { isConsentType } from "@/lib/consent";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function GET(request: Request) {
  const guard = await requirePermission("patient:read");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;
  const patientId = str(new URL(request.url).searchParams.get("patientId")) || undefined;
  const [records, summary] = await Promise.all([
    listConsents(companyId, { patientId }),
    consentSummary(companyId, new Date()),
  ]);
  return NextResponse.json({ consents: records, summary });
}

export async function POST(request: Request) {
  const guard = await requirePermission("patient:write");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const patientId = str(body?.patientId);
  const grantor = str(body?.grantor);
  if (!patientId || !grantor) {
    return NextResponse.json({ error: "No. RM pasien dan pemberi consent wajib diisi" }, { status: 400 });
  }
  if (!isConsentType(body?.consentType)) {
    return NextResponse.json({ error: "Jenis consent tidak valid" }, { status: 400 });
  }
  const validUntil = str(body?.validUntil) || null;
  if (validUntil && Number.isNaN(Date.parse(validUntil))) {
    return NextResponse.json({ error: "Tanggal berlaku tidak valid" }, { status: 400 });
  }
  const rec = await recordConsent(guard.session.company.id, {
    patientId, consentType: body.consentType, grantor,
    relationship: str(body?.relationship) || null, scope: str(body?.scope) || null,
    validUntil, createdBy: guard.session.user.id,
  });
  return NextResponse.json(rec, { status: 201 });
}

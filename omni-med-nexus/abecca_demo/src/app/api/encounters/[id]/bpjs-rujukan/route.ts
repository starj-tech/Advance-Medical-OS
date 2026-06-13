import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getEncounter } from "@/server/clinical/encounters";
import { checkRujukan } from "@/server/bpjs/client";
import { latestRujukan, saveRujukan } from "@/server/bpjs/referrals";

export const dynamic = "force-dynamic";

/** Latest referral looked up for this encounter. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("billing:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  return NextResponse.json({ rujukan: (await latestRujukan(guard.session.company.id, id)) ?? null });
}

/** Look up a member's BPJS referral (mock when BPJS_* unset) and persist it. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("billing:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;
  const encounter = await getEncounter(companyId, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

  const body = await request.json();
  const noKartu = typeof body?.noKartu === "string" ? body.noKartu.replace(/\s/g, "") : "";
  if (!/^\d{10,16}$/.test(noKartu)) {
    return NextResponse.json({ error: "noKartu (10–16 digit) wajib diisi" }, { status: 400 });
  }

  const info = await checkRujukan(noKartu);
  if (!info.found) {
    return NextResponse.json({ error: "Rujukan aktif tidak ditemukan untuk peserta ini" }, { status: 404 });
  }
  const record = await saveRujukan(companyId, id, encounter.patientId, {
    noKartu,
    noRujukan: info.noRujukan,
    asalFaskes: info.asalFaskes,
    diagnosaKode: info.diagnosaKode,
    diagnosaNama: info.diagnosaNama,
    tglRujukan: info.tglRujukan,
    isMock: info.mock,
    createdBy: guard.session.user.id,
  });
  return NextResponse.json(record, { status: 201 });
}

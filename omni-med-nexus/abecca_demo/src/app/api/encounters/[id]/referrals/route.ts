import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getEncounter } from "@/server/clinical/encounters";
import {
  createReferral,
  listReferrals,
  REFERRAL_URGENCIES,
  type ReferralUrgency,
} from "@/server/clinical/referrals";

export const dynamic = "force-dynamic";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("referral:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  return NextResponse.json(await listReferrals(guard.session.company.id, id));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("referral:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;

  const encounter = await getEncounter(companyId, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

  const body = await request.json();
  const destinationFacility = str(body?.destinationFacility);
  const reason = str(body?.reason);
  if (!destinationFacility || !reason) {
    return NextResponse.json(
      { error: "destinationFacility and reason are required" },
      { status: 400 },
    );
  }
  const urgency: ReferralUrgency = REFERRAL_URGENCIES.includes(body?.urgency) ? body.urgency : "rutin";

  const referral = await createReferral(companyId, id, {
    patientId: encounter.patientId,
    destinationFacility,
    reason,
    urgency,
    notes: str(body?.notes),
    referredBy: guard.session.user.id,
  });
  return NextResponse.json(referral, { status: 201 });
}

import { NextResponse } from "next/server";
import { getPortalSession, readPortalToken } from "@/server/portal/access";
import { getPortalSummary } from "@/server/portal/summary";

export const dynamic = "force-dynamic";

/** The signed-in patient's own portal summary (appointments, results, billing, resumes). */
export async function GET() {
  const token = await readPortalToken();
  const identity = token ? await getPortalSession(token) : undefined;
  if (!identity) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return NextResponse.json(await getPortalSummary(identity.companyId, identity.patientId));
}

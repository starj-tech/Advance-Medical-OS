import { NextResponse } from "next/server";
import { requireApiKey } from "@/server/integrations/public-auth";
import { listAppointments } from "@/server/scheduling/appointments";

export const dynamic = "force-dynamic";

/** Public API: the authenticated tenant's appointments (operational data). */
export async function GET(request: Request) {
  const auth = await requireApiKey(request);
  if (auth.error) return auth.error;
  return NextResponse.json({ data: await listAppointments(auth.companyId) });
}

import { NextResponse } from "next/server";
import { requireApiKey } from "@/server/integrations/public-auth";

export const dynamic = "force-dynamic";

/** Public API: confirm the key and echo the tenant it is scoped to. */
export async function GET(request: Request) {
  const auth = await requireApiKey(request);
  if (auth.error) return auth.error;
  return NextResponse.json({ company: { id: auth.companyId }, apiVersion: "v1" });
}

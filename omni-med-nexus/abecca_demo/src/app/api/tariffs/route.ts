import { NextResponse } from "next/server";
import { getTariffs } from "@/server/db";
import { requirePermission } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("tariff:read");
  if (guard.error) return guard.error;
  return NextResponse.json(await getTariffs());
}

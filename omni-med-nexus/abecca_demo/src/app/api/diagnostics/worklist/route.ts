import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { isDiagnosticStatus, listAllDiagnosticOrders } from "@/server/clinical/diagnostic-orders";
import type { DiagnosticCategory } from "@/lib/diagnostic-catalog";

export const dynamic = "force-dynamic";

/** Company-wide lab/radiology worklist for lab staff (?category=&status=). */
export async function GET(request: Request) {
  const guard = await requirePermission("diagnostic:read");
  if (guard.error) return guard.error;
  const url = new URL(request.url);
  const cat = url.searchParams.get("category");
  const status = url.searchParams.get("status");
  const category: DiagnosticCategory | undefined =
    cat === "lab" || cat === "radiology" ? cat : undefined;
  return NextResponse.json(
    await listAllDiagnosticOrders(guard.session.company.id, {
      category,
      status: isDiagnosticStatus(status) ? status : undefined,
    }),
  );
}

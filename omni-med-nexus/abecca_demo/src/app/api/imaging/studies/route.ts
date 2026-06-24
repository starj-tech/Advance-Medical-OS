import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { createImagingStudy, listImagingStudies } from "@/server/clinical/imaging";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requirePermission("diagnostic:read");
  if (guard.error) return guard.error;
  const url = new URL(request.url);
  const patientId = url.searchParams.get("patientId") ?? undefined;
  const orderId = url.searchParams.get("orderId") ?? undefined;
  return NextResponse.json(
    await listImagingStudies(guard.session.company.id, { patientId, orderId }),
  );
}

export async function POST(request: Request) {
  const guard = await requirePermission("diagnostic:result");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const result = await createImagingStudy(guard.session.company.id, {
    orderId: typeof body?.orderId === "string" ? body.orderId : null,
    patientId: typeof body?.patientId === "string" ? body.patientId : "",
    accession: typeof body?.accession === "string" ? body.accession : null,
    modality: typeof body?.modality === "string" ? body.modality : "",
    description: typeof body?.description === "string" ? body.description : "",
    images: body?.images,
    createdBy: guard.session.user.id,
  });
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}

import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getEncounter } from "@/server/clinical/encounters";
import {
  DIET_ROUTES,
  DIET_STATUSES,
  addDietOrder,
  listDietOrders,
  setDietOrderStatus,
  type DietRoute,
  type DietStatus,
} from "@/server/clinical/diet";

export const dynamic = "force-dynamic";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("diet:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  return NextResponse.json(await listDietOrders(guard.session.company.id, id));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("diet:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;

  const encounter = await getEncounter(companyId, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

  const body = await request.json();
  const dietType = str(body?.dietType);
  const route = body?.route as DietRoute;
  if (!dietType || !DIET_ROUTES.includes(route)) {
    return NextResponse.json(
      { error: "dietType and a valid route (oral|enteral|parenteral) are required" },
      { status: 400 },
    );
  }
  const caloriesRaw = body?.caloriesKcal;
  const caloriesKcal =
    typeof caloriesRaw === "number" && Number.isFinite(caloriesRaw) && caloriesRaw > 0
      ? Math.round(caloriesRaw)
      : null;

  const order = await addDietOrder(companyId, id, {
    patientId: encounter.patientId,
    dietType,
    route,
    caloriesKcal,
    restrictions: str(body?.restrictions),
    orderedBy: guard.session.user.id,
  });
  return NextResponse.json(order, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("diet:write");
  if (guard.error) return guard.error;
  await context.params; // encounter id not needed; order is addressed by its own id
  const body = await request.json();
  const orderId = str(body?.orderId);
  const status = body?.status as DietStatus;
  if (!orderId || !DIET_STATUSES.includes(status)) {
    return NextResponse.json({ error: "orderId and a valid status are required" }, { status: 400 });
  }
  const updated = await setDietOrderStatus(guard.session.company.id, orderId, status);
  if (!updated) return NextResponse.json({ error: "Diet order not found" }, { status: 404 });
  return NextResponse.json(updated);
}

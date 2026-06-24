import { NextResponse } from "next/server";
import { registerCompany, RegisterError } from "@/server/auth/store";

export const dynamic = "force-dynamic";

/**
 * Register a company (tenant). In production this runs after a successful Stripe
 * checkout; for now it can be called directly. Returns the generated Company ID
 * and the admin's one-time password (emailed to the PIC in production).
 */
export async function POST(request: Request) {
  const body = await request.json();
  if (
    !body?.legalName ||
    !body?.picEmail ||
    !body?.admin?.fullName ||
    !body?.admin?.email ||
    !body?.admin?.subRole
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  try {
    const result = await registerCompany(body);
    return NextResponse.json(
      {
        companyCode: result.company.companyCode,
        company: result.company,
        adminTempPassword: result.adminTempPassword,
        employeeCount: result.employeeCount,
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof RegisterError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}

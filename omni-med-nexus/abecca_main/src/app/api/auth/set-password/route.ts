import { NextResponse } from "next/server";
import { setEmployeePassword } from "@/server/auth/store";

export const dynamic = "force-dynamic";

/** Consume an invite token and set the employee's password (activates them). */
export async function POST(request: Request) {
  const { token, password } = await request.json();
  if (!token || !password || String(password).length < 8) {
    return NextResponse.json(
      { error: "Token dan password (minimal 8 karakter) wajib diisi." },
      { status: 400 },
    );
  }
  const user = await setEmployeePassword(String(token), String(password));
  if (!user) {
    return NextResponse.json(
      { error: "Tautan undangan tidak valid atau sudah kedaluwarsa." },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, email: user.email });
}

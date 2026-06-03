/**
 * Session cookie helpers. The cookie holds the opaque session token; the server
 * stores only its hash (see server/auth/store.ts).
 */
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth-cookie";

export { SESSION_COOKIE };

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/**
 * Public-API authentication. Resolves the `Authorization: Bearer abk_…` header to
 * a tenant via the API-key store, then rate-limits per key (reusing the 6I
 * limiter). Returns the tenant context or a ready error response — the public
 * routes stay thin and never see a session cookie.
 */
import { NextResponse } from "next/server";
import { verifyApiKey } from "./api-keys";
import { enforceRateLimit } from "../security/rate-limit";
import { RATE_RULES } from "@/lib/rate-limit";

type ApiAuth =
  | { companyId: string; keyId: string; error?: undefined }
  | { companyId?: undefined; error: NextResponse };

export async function requireApiKey(request: Request): Promise<ApiAuth> {
  const header = request.headers.get("authorization") ?? "";
  const raw = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim() ?? "";
  if (!raw) {
    return {
      error: NextResponse.json(
        { error: "Missing API key" },
        { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
      ),
    };
  }
  const resolved = await verifyApiKey(raw);
  if (!resolved) {
    return { error: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };
  }
  const limited = await enforceRateLimit(`api:${resolved.keyId}`, RATE_RULES.publicApi, {
    action: "public_api",
    companyId: resolved.companyId,
  });
  if (limited) return { error: limited };
  return { companyId: resolved.companyId, keyId: resolved.keyId };
}

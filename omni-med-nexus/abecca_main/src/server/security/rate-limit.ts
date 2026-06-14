/**
 * Server-side rate limiting. Holds per-key hit timestamps in a process-global map
 * and decides via the pure evaluator (lib/rate-limit). This is in-memory and
 * therefore per-instance — honest for preview/single-instance; a multi-instance
 * production deployment would back this with Redis. A breach is recorded as a
 * `security` observability event (see server/observability/log) so it surfaces on
 * the dashboard, and `enforceRateLimit` returns a ready 429 with Retry-After.
 */
import { NextResponse } from "next/server";
import { evaluateWindow, type RateRule } from "@/lib/rate-limit";
import { logEvent } from "@/server/observability/log";

const MAX_KEYS = 10_000;
const g = globalThis as unknown as { __abeccaRateHits?: Map<string, number[]> };
const hits = g.__abeccaRateHits ?? (g.__abeccaRateHits = new Map());

export interface RateResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/** Register one request against `key` and return whether it is permitted. */
export function rateLimit(key: string, rule: RateRule): RateResult {
  const now = Date.now();
  const decision = evaluateWindow(hits.get(key) ?? [], now, rule);
  hits.set(key, decision.allowed ? [...decision.inWindow, now] : decision.inWindow);

  // Cheap unbounded-growth guard: drop the oldest-inserted keys.
  if (hits.size > MAX_KEYS) {
    const excess = hits.size - MAX_KEYS;
    let i = 0;
    for (const k of hits.keys()) {
      if (i++ >= excess) break;
      hits.delete(k);
    }
  }
  return { allowed: decision.allowed, remaining: decision.remaining, retryAfterMs: decision.retryAfterMs };
}

/**
 * Enforce a limit for a sensitive action. Returns a 429 NextResponse to return
 * early when the limit is exceeded (recording a security event), or null when the
 * request may proceed.
 */
export async function enforceRateLimit(
  key: string,
  rule: RateRule,
  ctx: { action: string; companyId?: string | null },
): Promise<NextResponse | null> {
  const r = rateLimit(key, rule);
  if (r.allowed) return null;
  const retryAfterSec = Math.ceil(r.retryAfterMs / 1000);
  await logEvent({
    level: "warn",
    scope: "security",
    message: `Rate limit terlampaui (${ctx.action})`,
    companyId: ctx.companyId ?? null,
    fields: { action: ctx.action, retryAfterSec },
  });
  return NextResponse.json(
    { error: "Terlalu banyak percobaan. Coba lagi sebentar.", retryAfterSec },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}

/** Test/maintenance helper — clears all recorded hits. */
export function resetRateLimits(): void {
  hits.clear();
}

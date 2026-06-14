/**
 * Rate-limiting core — a pure sliding-window evaluator, client-safe and fully
 * deterministic so it can be unit-tested without a clock or a store. The server
 * (server/security/rate-limit.ts) keeps the per-key hit timestamps; this module
 * only decides, given those timestamps and "now", whether the next request is
 * allowed and when the caller may retry. Used to throttle the credential
 * endpoints (login, patient-portal login) against brute force.
 */
export interface RateRule {
  /** Max requests permitted within the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateDecision {
  allowed: boolean;
  /** Requests still permitted in the current window after this one. */
  remaining: number;
  /** Milliseconds until the caller may retry (0 when allowed). */
  retryAfterMs: number;
  /** The input hits pruned to those still inside the window (store writes this back). */
  inWindow: number[];
}

/**
 * Decide whether one more request is allowed, given prior hit timestamps. Prunes
 * timestamps older than the window; a request is allowed while fewer than `limit`
 * remain inside it. Pure — no Date.now(), no mutation of `hits`.
 */
export function evaluateWindow(hits: number[], now: number, rule: RateRule): RateDecision {
  const cutoff = now - rule.windowMs;
  const inWindow = hits.filter((t) => t > cutoff).sort((a, b) => a - b);
  const allowed = inWindow.length < rule.limit;
  const remaining = allowed ? Math.max(0, rule.limit - inWindow.length - 1) : 0;
  const retryAfterMs = allowed ? 0 : Math.max(0, inWindow[0] + rule.windowMs - now);
  return { allowed, remaining, retryAfterMs, inWindow };
}

/** Named limits for the sensitive endpoints (per account/key, per minute). */
export const RATE_RULES = {
  login: { limit: 5, windowMs: 60_000 },
  portalLogin: { limit: 6, windowMs: 60_000 },
  publicApi: { limit: 120, windowMs: 60_000 },
} as const satisfies Record<string, RateRule>;

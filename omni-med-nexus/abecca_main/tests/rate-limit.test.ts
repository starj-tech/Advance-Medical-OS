import { describe, it, expect } from "vitest";
import { evaluateWindow, RATE_RULES } from "@/lib/rate-limit";

const rule = { limit: 2, windowMs: 1000 };

describe("rate-limit: evaluateWindow (pure sliding window)", () => {
  it("allows when no prior hits", () => {
    const d = evaluateWindow([], 2000, rule);
    expect(d.allowed).toBe(true);
    expect(d.remaining).toBe(1); // limit - 0 - 1
    expect(d.retryAfterMs).toBe(0);
    expect(d.inWindow).toEqual([]);
  });

  it("prunes hits older than the window", () => {
    // cutoff = now - windowMs = 1000; 500 is stale, 1500 is live.
    const d = evaluateWindow([500, 1500], 2000, rule);
    expect(d.inWindow).toEqual([1500]);
    expect(d.allowed).toBe(true);
    expect(d.remaining).toBe(0);
  });

  it("blocks at the limit and reports retry time", () => {
    const d = evaluateWindow([1200, 1500], 2000, rule);
    expect(d.allowed).toBe(false);
    expect(d.remaining).toBe(0);
    expect(d.retryAfterMs).toBe(200); // oldest(1200) + window(1000) - now(2000)
  });

  it("sorts the surviving timestamps", () => {
    expect(evaluateWindow([1800, 1100, 1500], 2000, { limit: 5, windowMs: 1000 }).inWindow)
      .toEqual([1100, 1500, 1800]);
  });
});

describe("rate-limit: named rules", () => {
  it("matches the documented sensitive-endpoint limits", () => {
    expect(RATE_RULES.login).toEqual({ limit: 5, windowMs: 60_000 });
    expect(RATE_RULES.portalLogin).toEqual({ limit: 6, windowMs: 60_000 });
    expect(RATE_RULES.publicApi).toEqual({ limit: 120, windowMs: 60_000 });
  });
});

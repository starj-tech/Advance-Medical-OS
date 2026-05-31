/**
 * Typed HTTP client for the Abecca Demo API (the Next.js BFF under /api).
 * Base URL via NEXT_PUBLIC_API_BASE_URL so it can later target the Rust API.
 */

import type { Capability, Scenario, sandboxInfo } from "./data";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  capabilities: () => request<Capability[]>("/capabilities"),
  scenarios: () => request<Scenario[]>("/scenarios"),
  sandbox: () => request<typeof sandboxInfo>("/sandbox"),
};

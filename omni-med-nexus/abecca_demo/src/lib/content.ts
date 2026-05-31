"use client";

/**
 * Content store for the Abecca Demo app — wired to the HTTP API.
 *
 * The showcase capabilities are served by /api/capabilities. Eager seed gives
 * SSR/first paint fully-populated content; the store revalidates from the API
 * on first subscription. (Scenario step progress is separate — it is per-device
 * and lives in localStorage, see progress.ts.)
 */

import { useSyncExternalStore } from "react";
import type { Capability } from "./data";
import { capabilities as seedCapabilities } from "./data";
import { api } from "./api";

let capabilities: Capability[] = [...seedCapabilities];
const listeners = new Set<() => void>();
let revalidated = false;

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (!revalidated) {
    revalidated = true;
    void (async () => {
      try {
        capabilities = await api.capabilities();
        for (const l of listeners) l();
      } catch {
        // keep seed if the API is unreachable
      }
    })();
  }
  return () => listeners.delete(cb);
}

const getCapabilities = () => capabilities;

export function useCapabilities(): Capability[] {
  return useSyncExternalStore(subscribe, getCapabilities, getCapabilities);
}

"use client";

/**
 * Training-scenario progress, persisted to localStorage so a learner's place
 * survives reloads (this is a training sandbox, so progress is the one thing
 * worth keeping). Built on useSyncExternalStore; cross-tab updates sync via the
 * storage event.
 */

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "abecca-demo-progress";

// Map of "<scenarioId>:<stepIndex>" -> true
type Progress = Record<string, boolean>;

const listeners = new Set<() => void>();

let cache: Progress = {};
let cacheRaw = "";

function read(): Progress {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? "{}";
    if (raw !== cacheRaw) {
      cache = JSON.parse(raw) as Progress;
      cacheRaw = raw;
    }
    return cache;
  } catch {
    return {};
  }
}

function write(next: Progress) {
  try {
    cacheRaw = JSON.stringify(next);
    cache = next;
    localStorage.setItem(STORAGE_KEY, cacheRaw);
  } catch {
    // ignore storage failures
  }
  for (const l of listeners) l();
}

const key = (scenarioId: string, step: number) => `${scenarioId}:${step}`;

export function toggleStep(scenarioId: string, step: number) {
  const current = read();
  const k = key(scenarioId, step);
  write({ ...current, [k]: !current[k] });
}

export function resetScenario(scenarioId: string, stepCount: number) {
  const current = { ...read() };
  for (let i = 0; i < stepCount; i++) delete current[key(scenarioId, i)];
  write(current);
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: Progress = {};

/** Returns the set of completed steps for a scenario as a boolean array. */
export function useScenarioProgress(scenarioId: string, stepCount: number): boolean[] {
  const progress = useSyncExternalStore(
    subscribe,
    read,
    () => EMPTY,
  );
  return Array.from({ length: stepCount }, (_, i) => !!progress[key(scenarioId, i)]);
}

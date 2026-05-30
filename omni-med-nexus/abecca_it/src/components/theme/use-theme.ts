"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";
export type Resolved = "light" | "dark";

const STORAGE_KEY = "abecca-theme";

const listeners = new Set<() => void>();

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function getTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
}

/** Apply the resolved theme to <html>; returns what was applied. */
function applyTheme(theme: Theme): Resolved {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  return dark ? "dark" : "light";
}

function emit() {
  for (const l of listeners) l();
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore storage failures (private mode, etc.)
  }
  applyTheme(theme);
  emit();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  // Re-apply + notify when the OS preference changes while in system mode.
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onMedia = () => {
    if (getTheme() === "system") {
      applyTheme("system");
      emit();
    }
  };
  mq.addEventListener("change", onMedia);
  return () => {
    listeners.delete(callback);
    mq.removeEventListener("change", onMedia);
  };
}

/** Selected theme preference ("system" on the server / before hydration). */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "system");
}

/** The concrete light/dark currently applied. */
export function useResolvedTheme(): Resolved {
  return useSyncExternalStore(
    subscribe,
    () =>
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    () => "light",
  );
}

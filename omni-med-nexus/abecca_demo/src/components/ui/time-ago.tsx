"use client";

import { useSyncExternalStore } from "react";
import { formatDateTime, timeAgo } from "@/lib/utils";

const noopSubscribe = () => () => {};

/**
 * Relative timestamp that is hydration-safe: during SSR / initial hydration it
 * renders a deterministic absolute time (pinned timezone), then swaps to the
 * live "x minutes ago" form on the client. Built on useSyncExternalStore so it
 * never trips set-state-in-effect rules.
 */
export function TimeAgo({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    noopSubscribe,
    () => timeAgo(iso), // client snapshot
    () => formatDateTime(iso), // server / hydration snapshot
  );
  return (
    <span suppressHydrationWarning title={formatDateTime(iso)}>
      {text}
    </span>
  );
}

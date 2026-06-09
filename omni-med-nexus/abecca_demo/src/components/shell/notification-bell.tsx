"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import type { Notification } from "@/server/notify/center";
import { TimeAgo } from "@/components/ui/time-ago";

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const unread = items.filter((n) => !n.readAt).length;

  const refresh = useCallback(async () => {
    const res = await fetch("/api/notifications");
    const data: Notification[] = res.ok ? await res.json() : [];
    setItems(data);
  }, []);

  useEffect(() => {
    // Async data load; state set after await (false positive for the rule).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const markAll = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    await refresh();
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-sm font-semibold">Notifikasi</span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {items.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Tidak ada notifikasi.
                </li>
              ) : (
                items.map((n) => (
                  <li key={n.id} className={`px-4 py-3 ${n.readAt ? "" : "bg-primary/[0.04]"}`}>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      <TimeAgo iso={n.createdAt} />
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { UserCog } from "lucide-react";
import { DEMO_ROLES, DEMO_ROLE_COOKIE } from "@/lib/demo-roles";

/**
 * Demo-only persona picker. Writes the chosen role to the `demo-role` cookie and
 * reloads so server components, the permission guard and <Can> all re-evaluate
 * as that role. This is how a visitor experiences every persona in one app.
 */
export function DemoRoleSwitcher() {
  const [key, setKey] = useState("direktur");

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )demo-role=([^;]+)/);
    // Sync the control to the cookie after mount (avoids SSR hydration mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (m) setKey(decodeURIComponent(m[1]));
  }, []);

  const change = (next: string) => {
    document.cookie = `${DEMO_ROLE_COOKIE}=${next}; path=/; max-age=31536000`;
    window.location.reload();
  };

  return (
    <label className="hidden items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs sm:flex">
      <UserCog className="size-4 text-primary" />
      <span className="text-muted-foreground">Peran demo</span>
      <select
        value={key}
        onChange={(e) => change(e.target.value)}
        aria-label="Pilih peran demo"
        className="bg-transparent text-sm font-medium outline-none"
      >
        {DEMO_ROLES.map((r) => (
          <option key={r.key} value={r.key}>{r.label}</option>
        ))}
      </select>
    </label>
  );
}

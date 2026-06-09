"use client";

import { useEffect, useState } from "react";
import type { RoleTier } from "./rbac";

export interface SessionUser {
  id: string;
  companyId: string;
  fullName: string;
  email: string;
  roleTier: RoleTier;
  subRole: string;
  isCompanyAdmin: boolean;
  status: string;
}
export interface SessionCompany {
  id: string;
  companyCode: string;
  legalName: string;
  plan: string;
}
export interface SessionData {
  user: SessionUser;
  company: SessionCompany;
}

// Module-level cache so multiple <Can>/topbar consumers share one /me fetch.
let cache: SessionData | null | undefined;

export function useSession(): { session: SessionData | null | undefined; loading: boolean } {
  const [session, setSession] = useState<SessionData | null | undefined>(cache);

  useEffect(() => {
    if (cache !== undefined) return;
    let active = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? (r.json() as Promise<SessionData>) : null))
      .then((data) => {
        cache = data;
        if (active) setSession(data);
      })
      .catch(() => {
        cache = null;
        if (active) setSession(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return { session, loading: session === undefined };
}

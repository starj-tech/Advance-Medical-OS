"use client";

import { hasPermission, type Permission } from "@/lib/permissions";
import { useSession } from "@/lib/use-session";

/** Render children only if the current user holds `permission`. */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { session, loading } = useSession();
  if (loading) return null;
  if (!session?.user || !hasPermission(session.user, permission)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}

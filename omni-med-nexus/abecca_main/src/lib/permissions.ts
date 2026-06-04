/**
 * Authorization model for Abecca — permission catalogue + tier/sub-role mapping.
 *
 * RBAC has two axes (lib/rbac.ts): a coarse **tier** (executive/manager/doctor/
 * staff) granting a baseline permission set, plus a hospital **sub-role** that
 * can add finer grants (e.g. a pharmacist dispenses, a cashier manages billing).
 * `isCompanyAdmin` (the PIC) is a tenant superuser.
 *
 * Client-safe (only a type import from rbac), so the UI `<Can>` guard and the
 * server `requirePermission()` share one source of truth.
 */
import type { RoleTier } from "./rbac";

export type Permission =
  | "patient:read"
  | "patient:write"
  | "encounter:read"
  | "encounter:write"
  | "diagnosis:read"
  | "diagnosis:write"
  | "note:read"
  | "note:write"
  | "medication:read"
  | "medication:order"
  | "mar:read"
  | "mar:administer"
  | "bed:read"
  | "bed:manage"
  | "device:read"
  | "device:write"
  | "formulary:read"
  | "formulary:dispense"
  | "tariff:read"
  | "tariff:manage"
  | "billing:read"
  | "billing:manage"
  | "audit:read"
  | "user:read"
  | "user:manage"
  | "analytics:read"
  | "notification:read";

export interface PermissionSubject {
  roleTier: RoleTier;
  subRole: string;
  isCompanyAdmin?: boolean;
}

/** Baseline permissions per tier. */
const TIER_PERMISSIONS: Record<RoleTier, Permission[]> = {
  executive: [
    "patient:read", "encounter:read", "diagnosis:read", "note:read",
    "medication:read", "mar:read", "bed:read", "device:read", "formulary:read",
    "tariff:read", "billing:read", "audit:read", "analytics:read", "user:read",
    "notification:read",
  ],
  manager: [
    "patient:read", "encounter:read", "encounter:write", "diagnosis:read",
    "note:read", "note:write", "medication:read", "medication:order", "mar:read",
    "bed:read", "bed:manage", "device:read", "device:write", "formulary:read",
    "tariff:read", "tariff:manage", "billing:read", "audit:read", "analytics:read",
    "user:read", "notification:read",
  ],
  doctor: [
    "patient:read", "patient:write", "encounter:read", "encounter:write",
    "diagnosis:read", "diagnosis:write", "note:read", "note:write",
    "medication:read", "medication:order", "mar:read", "mar:administer", "bed:read",
    "bed:manage", "device:read", "formulary:read", "tariff:read", "notification:read",
  ],
  staff: [
    "patient:read", "encounter:read", "note:read", "medication:read", "mar:read",
    "bed:read", "tariff:read", "billing:read", "notification:read",
  ],
};

/** Additive grants keyed by sub-role slug (lib/rbac.ts). */
const SUBROLE_OVERRIDES: Record<string, Permission[]> = {
  // Nursing & midwifery — CPPT, e-MAR administration and bed management as PPA.
  "perawat-pelaksana": ["note:read", "note:write", "mar:read", "mar:administer", "bed:read", "bed:manage"],
  "perawat-primer": ["note:read", "note:write", "mar:read", "mar:administer", "bed:read", "bed:manage"],
  "perawat-spesialis": ["note:read", "note:write", "mar:read", "mar:administer", "bed:read", "bed:manage"],
  bidan: ["note:read", "note:write", "mar:read", "mar:administer", "bed:read", "bed:manage"],
  // Pharmacy — pharmacists review medication orders and dispense.
  apoteker: ["formulary:read", "formulary:dispense", "medication:read"],
  ttk: ["formulary:read", "formulary:dispense", "medication:read"],
  "ka-farmasi": ["formulary:read", "formulary:dispense", "medication:read"],
  // Billing / finance / cashier
  kasir: ["billing:read", "billing:manage"],
  "staf-keuangan": ["billing:read", "billing:manage"],
  "mgr-keuangan": ["billing:read", "billing:manage"],
  "mgr-penagihan": ["billing:read", "billing:manage"],
  "dir-keuangan": ["billing:read", "billing:manage"],
  // HR / user management
  "mgr-sdm": ["user:read", "user:manage"],
  "staf-sdm": ["user:read", "user:manage"],
  "dir-sdm-umum": ["user:read", "user:manage"],
  // Biomedical / IT
  "teknisi-ipsrs": ["device:read", "device:write"],
  "mgr-ti": ["device:read", "device:write", "user:read"],
  cio: ["device:read", "device:write", "user:read", "audit:read"],
};

function permitSet(subject: PermissionSubject): Set<Permission> {
  const set = new Set<Permission>(TIER_PERMISSIONS[subject.roleTier] ?? []);
  for (const p of SUBROLE_OVERRIDES[subject.subRole] ?? []) set.add(p);
  return set;
}

export function hasPermission(subject: PermissionSubject, perm: Permission): boolean {
  if (subject.isCompanyAdmin) return true;
  return permitSet(subject).has(perm);
}

export function permissionsFor(subject: PermissionSubject): Permission[] {
  if (subject.isCompanyAdmin) {
    return Array.from(
      new Set<Permission>([
        ...Object.values(TIER_PERMISSIONS).flat(),
        ...Object.values(SUBROLE_OVERRIDES).flat(),
      ]),
    );
  }
  return Array.from(permitSet(subject));
}

/**
 * Demo role catalogue (client-safe — no server imports). The Abecca Demo app has
 * no login; a visitor picks one of these roles and the whole app reflects that
 * role's menu + permissions, so they can feel how Abecca Main behaves for each
 * persona before subscribing. The server turns the chosen key into a synthetic
 * session (server/auth/demo-session.ts).
 */
import type { RoleTier } from "@/lib/rbac";

export const DEMO_ROLE_COOKIE = "demo-role";

export interface DemoRoleMeta {
  key: string;
  label: string;
  fullName: string;
  roleTier: RoleTier;
  subRole: string;
  isCompanyAdmin: boolean;
}

export const DEMO_ROLES: DemoRoleMeta[] = [
  { key: "direktur", label: "Direktur Utama", fullName: "dr. Dewi Lestari, MARS", roleTier: "executive", subRole: "dir-utama", isCompanyAdmin: true },
  { key: "manajer", label: "Manajer Pelayanan", fullName: "Budi Santoso, S.K.M., M.M.", roleTier: "manager", subRole: "ka-rawat-inap", isCompanyAdmin: false },
  { key: "dokter", label: "Dokter (DPJP)", fullName: "dr. Andi Pratama", roleTier: "doctor", subRole: "dokter-umum", isCompanyAdmin: false },
  { key: "perawat", label: "Perawat", fullName: "Ns. Maya Sari, S.Kep", roleTier: "staff", subRole: "perawat-pelaksana", isCompanyAdmin: false },
  { key: "apoteker", label: "Apoteker", fullName: "apt. Sri Wahyuni, S.Farm", roleTier: "staff", subRole: "apoteker", isCompanyAdmin: false },
  { key: "kasir", label: "Kasir / Billing", fullName: "Rina Oktaviani", roleTier: "staff", subRole: "kasir", isCompanyAdmin: false },
];

export function demoRoleByKey(key: string | undefined | null): DemoRoleMeta {
  return DEMO_ROLES.find((r) => r.key === key) ?? DEMO_ROLES[0];
}

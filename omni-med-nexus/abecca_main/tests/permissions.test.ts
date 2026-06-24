import { describe, it, expect } from "vitest";
import { hasPermission, type PermissionSubject } from "@/lib/permissions";

const subject = (roleTier: PermissionSubject["roleTier"], subRole = "none", isCompanyAdmin = false): PermissionSubject =>
  ({ roleTier, subRole, isCompanyAdmin });

describe("permissions: RBAC matrix", () => {
  it("company admin is a superuser", () => {
    const admin = subject("staff", "none", true);
    expect(hasPermission(admin, "billing:manage")).toBe(true);
    expect(hasPermission(admin, "procurement:manage")).toBe(true);
  });

  it("executive reads broadly but cannot manage billing", () => {
    const exec = subject("executive");
    expect(hasPermission(exec, "formulary:read")).toBe(true);
    expect(hasPermission(exec, "billing:manage")).toBe(false);
  });

  it("doctor writes clinical but not billing", () => {
    const doc = subject("doctor");
    expect(hasPermission(doc, "patient:write")).toBe(true);
    expect(hasPermission(doc, "billing:manage")).toBe(false);
  });

  it("base staff lacks patient:write", () => {
    expect(hasPermission(subject("staff"), "patient:write")).toBe(false);
  });

  it("sub-role overrides add capabilities", () => {
    const apoteker = subject("staff", "apoteker");
    expect(hasPermission(apoteker, "formulary:dispense")).toBe(true);
    expect(hasPermission(apoteker, "procurement:manage")).toBe(true);
    expect(hasPermission(apoteker, "billing:manage")).toBe(false);

    const kasir = subject("staff", "kasir");
    expect(hasPermission(kasir, "billing:manage")).toBe(true);
  });

  it("procurement:read is a manager baseline but manage is not", () => {
    const mgr = subject("manager");
    expect(hasPermission(mgr, "procurement:read")).toBe(true);
    expect(hasPermission(mgr, "procurement:manage")).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { effectivePrivilegeStatus, daysUntilReview, isPrivilegeStatus, isPrivilegeCategory } from "@/lib/privileging";
import { createPrivilege, listPrivileges, updatePrivilege, privilegeSummary } from "@/server/hr/privileging";

const now = new Date("2026-06-20T00:00:00.000Z");

describe("privileging: effective status (pure)", () => {
  it("lapses only a granted privilege once its review date passes", () => {
    expect(effectivePrivilegeStatus("granted", "2026-06-10", now)).toBe("expired"); // past
    expect(effectivePrivilegeStatus("granted", "2026-12-31", now)).toBe("granted"); // future
    expect(effectivePrivilegeStatus("granted", null, now)).toBe("granted");         // no review date
  });
  it("leaves requested/suspended unchanged regardless of the date", () => {
    expect(effectivePrivilegeStatus("requested", "2026-01-01", now)).toBe("requested");
    expect(effectivePrivilegeStatus("suspended", "2026-01-01", now)).toBe("suspended");
  });
  it("computes days until review and validates enums", () => {
    expect(daysUntilReview("2026-06-25", now)).toBe(5);
    expect(daysUntilReview("2026-06-10", now)).toBe(-10);
    expect(daysUntilReview(null, now)).toBeNull();
    expect(isPrivilegeStatus("granted")).toBe(true);
    expect(isPrivilegeStatus("approved")).toBe(false);
    expect(isPrivilegeCategory("surgical")).toBe(true);
    expect(isPrivilegeCategory("dental-extra")).toBe(false);
  });
});

describe("privileging: registry store + summary (in-memory)", () => {
  const A = "priv-test-A";
  const B = "priv-test-B";
  let surgId = "";

  it("creates (default requested) and lists sorted by staff then privilege", async () => {
    const s = await createPrivilege(A, { staffName: "dr. Budi", category: "surgical", privilege: "Apendektomi" });
    await createPrivilege(A, { staffName: "dr. Budi", category: "surgical", privilege: "Herniotomi", status: "granted", reviewBy: "2026-12-31" });
    await createPrivilege(A, { staffName: "dr. Ani", category: "obstetric", privilege: "Sectio Caesarea", status: "granted", reviewBy: "2026-06-01" }); // already past
    surgId = s.id;
    expect(s.status).toBe("requested");
    const list = await listPrivileges(A);
    expect(list.map((p) => p.staffName)).toEqual(["dr. Ani", "dr. Budi", "dr. Budi"]);
    expect(list[1].privilege).toBe("Apendektomi"); // Budi's, alpha before Herniotomi
  });

  it("filters by status and category", async () => {
    expect((await listPrivileges(A, { status: "requested" })).map((p) => p.privilege)).toEqual(["Apendektomi"]);
    expect((await listPrivileges(A, { category: "obstetric" })).map((p) => p.privilege)).toEqual(["Sectio Caesarea"]);
  });

  it("summarises by EFFECTIVE status (granted-but-past-review counts as expired)", async () => {
    const sum = await privilegeSummary(A, now);
    expect(sum.total).toBe(3);
    expect(sum.byStatus.requested).toBe(1); // Apendektomi
    expect(sum.byStatus.granted).toBe(1);   // Herniotomi (review 2026-12-31)
    expect(sum.byStatus.expired).toBe(1);   // Sectio (review 2026-06-01, past)
    expect(sum.byStatus.suspended).toBe(0);
  });

  it("advances lifecycle (grant) and is tenant-isolated", async () => {
    const granted = await updatePrivilege(A, surgId, { status: "granted", reviewBy: "2027-01-01" });
    expect(granted!.status).toBe("granted");
    expect(granted!.reviewBy).toBe("2027-01-01");
    expect(await updatePrivilege(A, "nope", { status: "granted" })).toBeUndefined();
    expect((await listPrivileges(B)).length).toBe(0);
    expect(await updatePrivilege(B, surgId, { status: "suspended" })).toBeUndefined();
    expect((await privilegeSummary(B, now)).total).toBe(0);
  });
});

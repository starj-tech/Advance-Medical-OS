import { describe, it, expect } from "vitest";
import { slaState, daysBetween, SLA_TARGET_DAYS } from "@/lib/complaints";
import {
  createComplaint, listComplaints, updateComplaint, complaintSummary,
} from "@/server/quality/complaints";

describe("complaints: SLA logic (pure)", () => {
  const base = "2026-06-10T00:00:00.000Z";

  it("targets per severity", () => {
    expect(SLA_TARGET_DAYS).toEqual({ low: 7, medium: 3, high: 1 });
  });

  it("daysBetween floors and never goes negative", () => {
    expect(daysBetween(base, new Date("2026-06-13T00:00:00Z").getTime())).toBe(3);
    expect(daysBetween(base, new Date("2026-06-10T23:00:00Z").getTime())).toBe(0);
    expect(daysBetween(base, new Date("2026-06-09T00:00:00Z").getTime())).toBe(0);
  });

  it("open complaints are on_track within target, overdue past it", () => {
    expect(slaState("high", base, null, new Date("2026-06-10T12:00:00Z"))).toBe("on_track");
    expect(slaState("high", base, null, new Date("2026-06-12T00:00:00Z"))).toBe("overdue");
    expect(slaState("medium", base, null, new Date("2026-06-12T00:00:00Z"))).toBe("on_track");
    expect(slaState("medium", base, null, new Date("2026-06-15T00:00:00Z"))).toBe("overdue");
    expect(slaState("low", base, null, new Date("2026-06-16T00:00:00Z"))).toBe("on_track");
  });

  it("resolved complaints are met/breached vs the target at resolution time", () => {
    const later = new Date("2030-01-01T00:00:00Z"); // `now` is irrelevant once resolved
    expect(slaState("high", base, "2026-06-10T20:00:00Z", later)).toBe("met");
    expect(slaState("high", base, "2026-06-13T00:00:00Z", later)).toBe("breached");
    expect(slaState("low", base, "2026-06-16T00:00:00Z", later)).toBe("met");
  });
});

describe("complaints: register store + summary (in-memory)", () => {
  const A = "complaint-test-A";
  const B = "complaint-test-B";
  let id1 = "";
  let id2 = "";

  it("creates as open with no resolution stamp", async () => {
    const c1 = await createComplaint(A, { reporter: "Keluarga pasien", category: "service", severity: "high", subject: "Antrian terlalu lama" });
    const c2 = await createComplaint(A, { reporter: "Pasien", category: "billing", severity: "medium", subject: "Tagihan tidak jelas" });
    id1 = c1.id; id2 = c2.id;
    expect(c1.status).toBe("open");
    expect(c1.resolvedAt).toBeNull();
    expect(c2.category).toBe("billing");
  });

  it("lists newest-first and filters by status", async () => {
    const all = await listComplaints(A);
    expect(all.length).toBe(2);
    expect(await listComplaints(A, { status: "open" })).toHaveLength(2);
    expect(await listComplaints(A, { status: "resolved" })).toHaveLength(0);
  });

  it("stamps resolvedAt on close and clears it when reopened", async () => {
    const inProg = await updateComplaint(A, id1, { status: "in_progress", assignedTo: "Humas" });
    expect(inProg!.status).toBe("in_progress");
    expect(inProg!.resolvedAt).toBeNull();
    expect(inProg!.assignedTo).toBe("Humas");

    const resolved = await updateComplaint(A, id1, { status: "resolved", resolution: "Permohonan maaf + percepatan antrian" });
    expect(resolved!.status).toBe("resolved");
    expect(resolved!.resolvedAt).not.toBeNull();
    expect(resolved!.resolution).toContain("maaf");

    const reopened = await updateComplaint(A, id1, { status: "open" });
    expect(reopened!.resolvedAt).toBeNull();
  });

  it("summarizes status counts and counts only open complaints past SLA as overdue", async () => {
    // Re-close id1 so exactly one complaint is resolved.
    await updateComplaint(A, id1, { status: "resolved" });
    const future = new Date(Date.now() + 5 * 86_400_000); // both created ~now; 5 days later
    const sum = await complaintSummary(A, future);
    expect(sum.total).toBe(2);
    expect(sum.byStatus.resolved).toBe(1);
    expect(sum.byStatus.open).toBe(1);
    // Only id2 is still open (medium, target 3d) and now 5d old → overdue. Resolved id1 excluded.
    expect(sum.overdue).toBe(1);
  });

  it("accepts a backdated createdAt (historical import) reflected in the overdue tally", async () => {
    const old = await createComplaint(A, {
      reporter: "Pasien", category: "facility", severity: "high",
      subject: "AC kamar mati", createdAt: "2026-06-01T00:00:00.000Z",
    });
    expect(old.createdAt).toBe("2026-06-01T00:00:00.000Z");
    // 9 days later, a still-open high complaint (target 1d) is overdue.
    const sum = await complaintSummary(A, new Date("2026-06-10T00:00:00.000Z"));
    expect(sum.overdue).toBeGreaterThanOrEqual(1);
  });

  it("rejects unknown ids and is tenant-isolated", async () => {
    expect(await updateComplaint(A, "nope", { status: "closed" })).toBeUndefined();
    expect((await listComplaints(B)).length).toBe(0);
    expect(await updateComplaint(B, id2, { status: "closed" })).toBeUndefined();
    expect((await complaintSummary(B, new Date())).total).toBe(0);
  });
});

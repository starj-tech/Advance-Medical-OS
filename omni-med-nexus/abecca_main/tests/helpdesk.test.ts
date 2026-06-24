import { describe, it, expect } from "vitest";
import { responseSla, hoursBetween, RESPONSE_SLA_HOURS } from "@/lib/helpdesk";
import {
  createTicket, listTickets, updateTicket, ticketSummary,
} from "@/server/it/helpdesk";

describe("helpdesk: response SLA logic (pure)", () => {
  const base = "2026-06-20T00:00:00.000Z";

  it("targets per priority (hours)", () => {
    expect(RESPONSE_SLA_HOURS).toEqual({ low: 24, medium: 8, high: 4, critical: 1 });
  });

  it("hoursBetween never goes negative", () => {
    expect(hoursBetween(base, new Date("2026-06-20T04:00:00Z").getTime())).toBe(4);
    expect(hoursBetween(base, new Date("2026-06-19T00:00:00Z").getTime())).toBe(0);
  });

  it("open tickets are on_track within the target, overdue past it", () => {
    expect(responseSla("critical", base, null, new Date("2026-06-20T00:30:00Z"))).toBe("on_track"); // 0.5h ≤ 1h
    expect(responseSla("critical", base, null, new Date("2026-06-20T02:00:00Z"))).toBe("overdue");  // 2h > 1h
    expect(responseSla("high", base, null, new Date("2026-06-20T03:00:00Z"))).toBe("on_track");     // 3h ≤ 4h
    expect(responseSla("low", base, null, new Date("2026-06-21T06:00:00Z"))).toBe("overdue");       // 30h > 24h
  });

  it("responded tickets are met/breached vs the target at response time", () => {
    expect(responseSla("high", base, "2026-06-20T03:00:00Z", new Date("2030-01-01T00:00:00Z"))).toBe("met");
    expect(responseSla("high", base, "2026-06-20T09:00:00Z", new Date("2026-06-20T09:00:00Z"))).toBe("breached");
  });
});

describe("helpdesk: ticket register + summary (in-memory)", () => {
  const A = "ticket-test-A";
  const B = "ticket-test-B";
  let id1 = "";

  it("creates as open with no response stamp", async () => {
    const t1 = await createTicket(A, { reporter: "Perawat ICU", category: "hardware", priority: "critical", subject: "Monitor mati total" });
    await createTicket(A, { reporter: "Admin", category: "account", priority: "low", subject: "Reset password SIMRS" });
    id1 = t1.id;
    expect(t1.status).toBe("open");
    expect(t1.firstResponseAt).toBeNull();
  });

  it("lists newest-first and filters by priority/category", async () => {
    expect((await listTickets(A)).length).toBe(2);
    expect((await listTickets(A, { priority: "critical" })).map((t) => t.subject)).toEqual(["Monitor mati total"]);
    expect((await listTickets(A, { category: "account" })).map((t) => t.subject)).toEqual(["Reset password SIMRS"]);
  });

  it("stamps firstResponseAt the first time the ticket leaves open, and keeps it", async () => {
    const inProg = await updateTicket(A, id1, { status: "in_progress", assignedTo: "Teknisi-1" });
    expect(inProg!.firstResponseAt).not.toBeNull();
    const stamp = inProg!.firstResponseAt;
    const resolved = await updateTicket(A, id1, { status: "resolved", resolution: "Ganti kabel daya" });
    expect(resolved!.firstResponseAt).toBe(stamp); // unchanged on subsequent transitions
  });

  it("counts only still-open tickets past their response target as overdue", async () => {
    // id1 is now resolved; only the low-priority one stays open. Backdate it 30h via a fresh ticket.
    const old = await createTicket(A, { reporter: "Lab", category: "network", priority: "high", subject: "Jaringan lab lambat", createdAt: "2026-06-01T00:00:00.000Z" });
    const future = new Date("2026-06-02T00:00:00.000Z"); // 24h later; high target 4h → overdue
    const sum = await ticketSummary(A, future);
    expect(sum.total).toBe(3);
    expect(sum.byStatus.open).toBe(2); // the low one + the backdated high one
    expect(sum.byStatus.resolved).toBe(1);
    expect(sum.overdue).toBe(1); // only the backdated high ticket is past target at `future`
    expect(old.status).toBe("open");
  });

  it("rejects unknown ids and is tenant-isolated", async () => {
    expect(await updateTicket(A, "nope", { status: "closed" })).toBeUndefined();
    expect((await listTickets(B)).length).toBe(0);
    expect(await updateTicket(B, id1, { status: "closed" })).toBeUndefined();
    expect((await ticketSummary(B, new Date())).total).toBe(0);
  });
});

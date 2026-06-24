import { describe, it, expect } from "vitest";
import { contractExpiry, daysUntilEnd, isContractStatus, isContractType } from "@/lib/contracts";
import { createContract, listContracts, updateContract, contractSummary } from "@/server/procurement/contracts";

const now = new Date("2026-06-20T00:00:00.000Z");

describe("contracts: expiry state (pure)", () => {
  it("derives expired / expiring_soon / ok from the end date (60-day window), null when open-ended", () => {
    expect(contractExpiry(null, now)).toBeNull();
    expect(contractExpiry("2026-06-10", now)).toBe("expired");      // past
    expect(contractExpiry("2026-07-20", now)).toBe("expiring_soon"); // 30 days ≤ 60
    expect(contractExpiry("2026-08-19", now)).toBe("expiring_soon"); // exactly 60 days
    expect(contractExpiry("2026-12-31", now)).toBe("ok");           // > 60 days
  });
  it("computes days until end and validates enums", () => {
    expect(daysUntilEnd("2026-06-25", now)).toBe(5);
    expect(daysUntilEnd("2026-06-10", now)).toBe(-10);
    expect(daysUntilEnd(null, now)).toBeNull();
    expect(isContractStatus("active")).toBe(true);
    expect(isContractStatus("paused")).toBe(false);
    expect(isContractType("maintenance")).toBe(true);
    expect(isContractType("rental")).toBe(false);
  });
});

describe("contracts: register + summary (in-memory)", () => {
  const A = "contract-test-A";
  const B = "contract-test-B";
  let maintId = "";

  it("creates (default active) and sorts soonest-to-end first, open-ended last", async () => {
    const m = await createContract(A, { vendor: "PT Alat Medika", title: "Maintenance ventilator", type: "maintenance", value: 120_000_000, endDate: "2026-06-10" }); // expired
    await createContract(A, { vendor: "PT Jaringan Sehat", title: "Internet dedicated", type: "service", value: 60_000_000, endDate: "2026-07-15" }); // expiring_soon
    await createContract(A, { vendor: "CV Gas Medis", title: "Suplai oksigen", type: "supply", value: 200_000_000 }); // open-ended
    maintId = m.id;
    expect(m.status).toBe("active");
    const list = await listContracts(A);
    expect(list.map((c) => c.vendor)).toEqual(["PT Alat Medika", "PT Jaringan Sehat", "CV Gas Medis"]);
  });

  it("filters by status and type", async () => {
    expect((await listContracts(A, { type: "supply" })).map((c) => c.vendor)).toEqual(["CV Gas Medis"]);
    expect((await listContracts(A, { status: "active" })).length).toBe(3);
  });

  it("summarises status, active-only expiry, and total active value", async () => {
    const sum = await contractSummary(A, now);
    expect(sum.total).toBe(3);
    expect(sum.byStatus.active).toBe(3);
    expect(sum.expiry.expired).toBe(1);
    expect(sum.expiry.expiring_soon).toBe(1);
    expect(sum.expiry.ok).toBe(0); // the open-ended one is excluded (null)
    expect(sum.activeValue).toBe(380_000_000);
  });

  it("renews/terminates and recomputes the summary (terminated excluded from value/expiry)", async () => {
    const renewed = await updateContract(A, maintId, { endDate: "2027-06-10", value: 130_000_000 });
    expect(renewed!.endDate).toBe("2027-06-10");
    const term = await updateContract(A, maintId, { status: "terminated" });
    expect(term!.status).toBe("terminated");
    const sum = await contractSummary(A, now);
    expect(sum.byStatus.active).toBe(2);
    expect(sum.byStatus.terminated).toBe(1);
    expect(sum.activeValue).toBe(260_000_000); // 60M + 200M; terminated maintenance excluded
    expect(sum.expiry.expired).toBe(0); // expired one was the now-terminated maintenance
  });

  it("rejects unknown ids and is tenant-isolated", async () => {
    expect(await updateContract(A, "nope", { status: "active" })).toBeUndefined();
    expect((await listContracts(B)).length).toBe(0);
    expect(await updateContract(B, maintId, { status: "active" })).toBeUndefined();
    expect((await contractSummary(B, now)).activeValue).toBe(0);
  });
});

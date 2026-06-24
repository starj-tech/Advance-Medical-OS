import { describe, it, expect } from "vitest";
import { filledSections, isComplete, isHandoverShift, SBAR_FIELDS } from "@/lib/sbar";
import { recordHandover, acknowledgeHandover, listHandovers, handoverSummary } from "@/server/clinical/handovers";

const FULL = { situation: "Sesak", background: "PPOK", assessment: "SpO2 90%", recommendation: "Pantau O2" };

describe("sbar: helpers (pure)", () => {
  it("counts filled SBAR sections", () => {
    expect(filledSections({})).toBe(0);
    expect(filledSections({ situation: "x", background: "  " })).toBe(1); // blank not counted
    expect(filledSections(FULL)).toBe(SBAR_FIELDS.length);
  });
  it("is complete only when all four parts present", () => {
    expect(isComplete(FULL)).toBe(true);
    expect(isComplete({ ...FULL, recommendation: "" })).toBe(false);
  });
  it("validates shift", () => {
    expect(isHandoverShift("morning")).toBe(true);
    expect(isHandoverShift("dawn")).toBe(false);
  });
});

describe("handovers: server (in-memory)", () => {
  const A = "handover-test-A";
  const B = "handover-test-B";
  let id = "";

  it("records a complete handover and rejects an incomplete one", async () => {
    const r = await recordHandover(A, { patientId: "PAT-H1", patientName: "Tn. H", fromStaff: "Ns. Dewi", shift: "night", ...FULL });
    expect(r.ok).toBe(true);
    if (r.ok) { id = r.handover.id; expect(r.handover.status).toBe("pending"); expect(r.handover.shift).toBe("night"); }
    const bad = await recordHandover(A, { patientId: "PAT-H1", patientName: "Tn. H", fromStaff: "Ns. Dewi", ...FULL, assessment: "" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toBe("incomplete");
  });

  it("acknowledges once, then rejects re-acknowledge / unknown", async () => {
    expect((await handoverSummary(A)).pending).toBe(1);
    const ack = await acknowledgeHandover(A, id, { acknowledgedBy: "user-1" });
    expect(ack.ok).toBe(true);
    if (ack.ok) { expect(ack.handover.status).toBe("acknowledged"); expect(ack.handover.acknowledgedAt).not.toBeNull(); }
    const again = await acknowledgeHandover(A, id, {});
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe("already_acknowledged");
    const nf = await acknowledgeHandover(A, "nope", {});
    expect(nf.ok).toBe(false);
    if (!nf.ok) expect(nf.reason).toBe("not_found");
  });

  it("summarises and filters by status; tenant-isolated", async () => {
    const s = await handoverSummary(A);
    expect(s).toMatchObject({ total: 1, pending: 0, acknowledged: 1 });
    expect((await listHandovers(A, { status: "acknowledged" })).length).toBe(1);
    expect((await listHandovers(A, { status: "pending" })).length).toBe(0);
    expect((await listHandovers(B)).length).toBe(0);
    expect((await acknowledgeHandover(B, id, {})).ok).toBe(false); // cross-tenant
  });
});

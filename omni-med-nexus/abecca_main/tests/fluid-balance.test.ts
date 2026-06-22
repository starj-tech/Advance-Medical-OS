import { describe, it, expect } from "vitest";
import {
  isValidType, isValidVolume, totalIntake, totalOutput, netBalance, balanceStatus, fluidTypeLabel,
} from "@/lib/fluid-balance";
import { recordFluidEntry, listFluidEntries, fluidSummary } from "@/server/clinical/fluid-balance";

const E = (direction: "intake" | "output", volumeMl: number) => ({ direction, volumeMl });

describe("fluid-balance: helpers (pure)", () => {
  it("validates type↔direction pairing", () => {
    expect(isValidType("intake", "oral")).toBe(true);
    expect(isValidType("intake", "urine")).toBe(false); // urine is an output
    expect(isValidType("output", "urine")).toBe(true);
    expect(isValidType("output", "iv")).toBe(false);
  });
  it("validates volume", () => {
    expect(isValidVolume(250)).toBe(true);
    expect(isValidVolume(0)).toBe(false);
    expect(isValidVolume(-5)).toBe(false);
    expect(isValidVolume(2.5)).toBe(false);
  });
  it("tallies intake/output and nets them (signed)", () => {
    const entries = [E("intake", 500), E("intake", 200), E("output", 300), E("output", 150)];
    expect(totalIntake(entries)).toBe(700);
    expect(totalOutput(entries)).toBe(450);
    expect(netBalance(entries)).toBe(250);
  });
  it("bands the net by sign", () => {
    expect(balanceStatus(250)).toBe("positive");
    expect(balanceStatus(-250)).toBe("negative");
    expect(balanceStatus(0)).toBe("neutral");
  });
  it("labels fluid types", () => {
    expect(fluidTypeLabel("urine")).toBe("Urin");
    expect(fluidTypeLabel("unknown")).toBe("unknown");
  });
});

describe("fluid-balance: server (in-memory)", () => {
  const A = "fluid-test-A";
  const B = "fluid-test-B";
  const P1 = "PAT-F1";
  const P2 = "PAT-F2";

  it("records valid entries and rejects mismatched type / bad volume", async () => {
    expect((await recordFluidEntry(A, { patientId: P1, patientName: "Tn. A", direction: "intake", type: "iv", volumeMl: 500 })).ok).toBe(true);
    expect((await recordFluidEntry(A, { patientId: P1, patientName: "Tn. A", direction: "output", type: "urine", volumeMl: 300 })).ok).toBe(true);
    const badType = await recordFluidEntry(A, { patientId: P1, patientName: "Tn. A", direction: "intake", type: "urine", volumeMl: 100 });
    expect(badType.ok).toBe(false);
    if (!badType.ok) expect(badType.reason).toBe("invalid_type");
    const badVol = await recordFluidEntry(A, { patientId: P1, patientName: "Tn. A", direction: "intake", type: "oral", volumeMl: 0 });
    expect(badVol.ok).toBe(false);
    if (!badVol.ok) expect(badVol.reason).toBe("invalid_volume");
  });

  it("summarises net balance per patient and filters", async () => {
    // P2 has a negative balance: intake 200, output 600.
    await recordFluidEntry(A, { patientId: P2, patientName: "Ny. B", direction: "intake", type: "oral", volumeMl: 200 });
    await recordFluidEntry(A, { patientId: P2, patientName: "Ny. B", direction: "output", type: "urine", volumeMl: 600 });

    const p1 = await fluidSummary(A, { patientId: P1 });
    expect(p1).toMatchObject({ intake: 500, output: 300, net: 200, count: 2 });
    const p2 = await fluidSummary(A, { patientId: P2 });
    expect(p2).toMatchObject({ intake: 200, output: 600, net: -400 });
    expect(balanceStatus(p2.net)).toBe("negative");

    expect((await listFluidEntries(A, { patientId: P1 })).length).toBe(2);
    // Tenant-wide tally rolls up both patients.
    expect((await fluidSummary(A)).net).toBe(200 + -400);
  });

  it("is tenant-isolated", async () => {
    expect((await listFluidEntries(B)).length).toBe(0);
    expect((await fluidSummary(B)).count).toBe(0);
  });
});

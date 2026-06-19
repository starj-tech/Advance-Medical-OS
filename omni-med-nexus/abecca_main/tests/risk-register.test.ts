import { describe, it, expect } from "vitest";
import { riskScore, riskBand, bandFor } from "@/lib/risk-matrix";
import { createRisk, listRisks, updateRisk, riskSummary } from "@/server/quality/risk-register";

describe("risk-matrix: scoring & banding (pure)", () => {
  it("scores with clamping", () => {
    expect(riskScore(3, 4)).toBe(12);
    expect(riskScore(5, 5)).toBe(25);
    expect(riskScore(0, 3)).toBe(3);
    expect(riskScore(7, 2)).toBe(10);
    expect(riskScore(3, 9)).toBe(15);
  });
  it("bands by range", () => {
    expect(riskBand(1)).toBe("low");
    expect(riskBand(3)).toBe("low");
    expect(riskBand(4)).toBe("moderate");
    expect(riskBand(6)).toBe("moderate");
    expect(riskBand(7)).toBe("high");
    expect(riskBand(12)).toBe("high");
    expect(riskBand(13)).toBe("extreme");
    expect(riskBand(25)).toBe("extreme");
  });
  it("bandFor combines axes", () => {
    expect(bandFor(1, 1)).toBe("low");
    expect(bandFor(5, 5)).toBe("extreme");
    expect(bandFor(2, 2)).toBe("moderate");
    expect(bandFor(4, 2)).toBe("high");
  });
});

describe("risk register: store + summary (in-memory)", () => {
  const R = "risk-test-A";
  const B = "risk-test-B";
  let id1 = "";
  let id2 = "";
  let id3 = "";

  it("creates, derives score/band, and sorts by score desc", async () => {
    const r1 = await createRisk(R, { title: "Kebakaran ruang server", category: "operational", likelihood: 5, consequence: 5 });
    const r2 = await createRisk(R, { title: "Stok obat darurat menipis", category: "clinical", likelihood: 2, consequence: 2 });
    const r3 = await createRisk(R, { title: "Keluhan parkir", category: "reputational", likelihood: 1, consequence: 1 });
    id1 = r1.id; id2 = r2.id; id3 = r3.id;

    expect(r1.status).toBe("identified");
    expect(r1.score).toBe(25);
    expect(r1.band).toBe("extreme");
    expect(r2.band).toBe("moderate");
    expect(r3.band).toBe("low");

    const list = await listRisks(R);
    expect(list.length).toBe(3);
    expect(list[0].id).toBe(id1);
    expect(list[2].id).toBe(id3);
  });

  it("summarizes open risks by band/matrix and all by status", async () => {
    const sum = await riskSummary(R);
    expect(sum.total).toBe(3);
    expect(sum.byBand.extreme).toBe(1);
    expect(sum.byBand.moderate).toBe(1);
    expect(sum.byBand.low).toBe(1);
    expect(sum.byBand.high).toBe(0);
    expect(sum.byStatus.identified).toBe(3);
    expect(sum.matrix[4][4]).toBe(1); // L5 x C5
    expect(sum.matrix[1][1]).toBe(1); // L2 x C2
    expect(sum.matrix[0][0]).toBe(1); // L1 x C1
  });

  it("re-assesses (re-scores) and patches owner/mitigation", async () => {
    const r2b = await updateRisk(R, id2, { likelihood: 4, consequence: 4 });
    expect(r2b!.score).toBe(16);
    expect(r2b!.band).toBe("extreme");
    const r1b = await updateRisk(R, id1, { owner: "Manajer IPSRS", mitigation: "APAR + deteksi dini" });
    expect(r1b!.owner).toBe("Manajer IPSRS");
    expect(r1b!.mitigation).toBe("APAR + deteksi dini");
  });

  it("excludes closed risks from the open profile but keeps them in totals", async () => {
    await updateRisk(R, id3, { status: "closed" });
    const sum = await riskSummary(R);
    expect(sum.total).toBe(3);
    expect(sum.byStatus.closed).toBe(1);
    expect(sum.byStatus.identified).toBe(2);
    expect(sum.byBand.low).toBe(0);
    expect(sum.matrix[0][0]).toBe(0);
    expect(sum.matrix[3][3]).toBe(1); // re-assessed L4 x C4
    expect(sum.matrix[1][1]).toBe(0);
  });

  it("rejects unknown ids and is tenant-isolated", async () => {
    expect(await updateRisk(R, "nope", { status: "monitored" })).toBeUndefined();
    expect((await listRisks(B)).length).toBe(0);
    expect(await updateRisk(B, id1, { status: "monitored" })).toBeUndefined();
    expect((await riskSummary(B)).total).toBe(0);
  });
});

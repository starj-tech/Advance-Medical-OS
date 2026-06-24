import { describe, it, expect } from "vitest";
import { npsCategory, npsValue, csatAverage } from "@/lib/feedback";
import { createFeedback, listFeedback, feedbackSummary } from "@/server/quality/feedback";

describe("feedback: NPS & CSAT math (pure)", () => {
  it("buckets NPS scores at the standard boundaries", () => {
    expect(npsCategory(0)).toBe("detractor");
    expect(npsCategory(6)).toBe("detractor");
    expect(npsCategory(7)).toBe("passive");
    expect(npsCategory(8)).toBe("passive");
    expect(npsCategory(9)).toBe("promoter");
    expect(npsCategory(10)).toBe("promoter");
  });

  it("computes NPS as %promoters − %detractors", () => {
    expect(npsValue({ promoter: 6, passive: 2, detractor: 2 })).toBe(40); // 60% − 20%
    expect(npsValue({ promoter: 10, passive: 0, detractor: 0 })).toBe(100);
    expect(npsValue({ promoter: 0, passive: 0, detractor: 5 })).toBe(-100);
    expect(npsValue({ promoter: 1, passive: 1, detractor: 1 })).toBe(0);
    expect(npsValue({ promoter: 0, passive: 0, detractor: 0 })).toBeNull();
  });

  it("averages CSAT to one decimal, null when empty", () => {
    expect(csatAverage([5, 4, 3])).toBe(4);
    expect(csatAverage([5, 4])).toBe(4.5);
    expect(csatAverage([4, 4, 5])).toBe(4.3); // 13/3 = 4.33 → 4.3
    expect(csatAverage([])).toBeNull();
  });
});

describe("feedback: register store + summary (in-memory)", () => {
  const A = "feedback-test-A";
  const B = "feedback-test-B";

  it("creates responses and lists them newest-first", async () => {
    await createFeedback(A, { source: "post_visit", npsScore: 10, csatRating: 5, comment: "Pelayanan ramah", createdAt: "2026-06-01T00:00:00.000Z" });
    await createFeedback(A, { source: "discharge", npsScore: 6, csatRating: 2, comment: "Menunggu lama", createdAt: "2026-06-02T00:00:00.000Z" });
    await createFeedback(A, { source: "digital", npsScore: 8, createdAt: "2026-06-03T00:00:00.000Z" });
    const list = await listFeedback(A);
    expect(list.length).toBe(3);
    expect(list[0].source).toBe("digital"); // newest
    expect(list[0].csatRating).toBeNull();
  });

  it("summarizes NPS, CSAT, and category counts", async () => {
    const sum = await feedbackSummary(A);
    expect(sum.total).toBe(3);
    expect(sum.counts).toEqual({ promoter: 1, passive: 1, detractor: 1 });
    expect(sum.nps).toBe(0); // 33% − 33%
    expect(sum.csatAverage).toBe(3.5); // (5 + 2) / 2
    expect(sum.csatCount).toBe(2); // the digital response had no CSAT
  });

  it("is tenant-isolated", async () => {
    expect((await listFeedback(B)).length).toBe(0);
    const sumB = await feedbackSummary(B);
    expect(sumB.total).toBe(0);
    expect(sumB.nps).toBeNull();
    expect(sumB.csatAverage).toBeNull();
  });
});

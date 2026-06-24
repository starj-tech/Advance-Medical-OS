import { describe, it, expect } from "vitest";
import { computeEsi, isEsiLevel, type EsiInput } from "@/lib/esi";

const input = (o: Partial<EsiInput> = {}): EsiInput => ({
  lifeSaving: false, highRisk: false, resources: 0, dangerVitals: false, ...o,
});

describe("esi: computeEsi decision tree", () => {
  it("life-saving need is level 1 (overrides everything)", () => {
    expect(computeEsi(input({ lifeSaving: true, highRisk: true, resources: 5, dangerVitals: true })).level).toBe(1);
  });
  it("high-risk is level 2 (when not life-saving)", () => {
    expect(computeEsi(input({ highRisk: true, resources: 5, dangerVitals: true })).level).toBe(2);
  });
  it("resources map 0->5, 1->4, >=2->3", () => {
    expect(computeEsi(input({ resources: 0 })).level).toBe(5);
    expect(computeEsi(input({ resources: 1 })).level).toBe(4);
    expect(computeEsi(input({ resources: 2 })).level).toBe(3);
    expect(computeEsi(input({ resources: 5 })).level).toBe(3);
  });
  it("danger-zone vitals upgrade a level-3 to level-2", () => {
    expect(computeEsi(input({ resources: 2, dangerVitals: true })).level).toBe(2);
    expect(computeEsi(input({ resources: 3, dangerVitals: true })).level).toBe(2);
    // ...but not a level-4/5 (resources < 2)
    expect(computeEsi(input({ resources: 1, dangerVitals: true })).level).toBe(4);
  });
  it("clamps/floors the resource count", () => {
    expect(computeEsi(input({ resources: -5 })).level).toBe(5);
    expect(computeEsi(input({ resources: 2.9 })).level).toBe(3);
  });
  it("always returns a rationale", () => {
    expect(computeEsi(input({ lifeSaving: true })).rationale.length).toBeGreaterThan(0);
  });
});

describe("esi: isEsiLevel", () => {
  it("validates the 1-5 range", () => {
    expect(isEsiLevel(1)).toBe(true);
    expect(isEsiLevel(5)).toBe(true);
    expect(isEsiLevel(0)).toBe(false);
    expect(isEsiLevel(6)).toBe(false);
    expect(isEsiLevel("1")).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { findTest, evaluateResult } from "@/lib/diagnostic-catalog";

const GDS = findTest("GDS");      // ref 70–140, crit ≤50 / ≥400
const KALIUM = findTest("KALIUM"); // ref 3.5–5.1, crit ≤2.5 / ≥6.5
const HBA1C = findTest("HBA1C");   // ref 4–6.5, no critical
const ELEK = findTest("ELEK");     // panel, no numeric range

describe("diagnostic-catalog: lookup", () => {
  it("finds known codes and returns undefined for unknown", () => {
    expect(GDS?.name).toBe("Gula Darah Sewaktu");
    expect(findTest("NOPE")).toBeUndefined();
  });
});

describe("diagnostic-catalog: evaluateResult (critical-value flagging)", () => {
  it("returns unknown for a missing test or non-numeric value", () => {
    expect(evaluateResult(undefined, "100")).toBe("unknown");
    expect(evaluateResult(GDS, "tidak terbaca")).toBe("unknown");
    expect(evaluateResult(ELEK, "130")).toBe("unknown"); // panel has no ranges
  });

  it("grades within / outside the reference range", () => {
    expect(evaluateResult(GDS, "100")).toBe("normal");
    expect(evaluateResult(GDS, "60")).toBe("abnormal");  // <70 but >50
    expect(evaluateResult(GDS, "200")).toBe("abnormal"); // >140 but <400
  });

  it("flags panic values at or beyond the critical thresholds", () => {
    expect(evaluateResult(GDS, "45")).toBe("critical");   // ≤50
    expect(evaluateResult(GDS, "400")).toBe("critical");  // ≥400 (boundary)
    expect(evaluateResult(KALIUM, "2.5")).toBe("critical"); // ≤2.5 boundary
    expect(evaluateResult(KALIUM, "7")).toBe("critical");   // ≥6.5
    expect(evaluateResult(KALIUM, "2.6")).toBe("abnormal"); // <3.5 but >2.5
  });

  it("parses comma decimals and strips unit text", () => {
    const KREAT = findTest("KREAT"); // ref 0.6–1.3, crit ≥6
    expect(evaluateResult(KREAT, "1,0")).toBe("normal");
    expect(evaluateResult(KREAT, "7 mg/dL")).toBe("critical");
  });

  it("uses the reference range when no critical thresholds exist", () => {
    expect(evaluateResult(HBA1C, "5")).toBe("normal");
    expect(evaluateResult(HBA1C, "10")).toBe("abnormal"); // no crit defined
  });
});

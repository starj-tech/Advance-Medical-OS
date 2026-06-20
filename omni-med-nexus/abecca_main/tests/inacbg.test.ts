import { describe, it, expect } from "vitest";
import { groupByDiagnosis, tariffForClass, isCareClass } from "@/lib/inacbg";

describe("inacbg: diagnosis grouping (pure)", () => {
  it("maps ICD-10 prefixes to case-base groups", () => {
    expect(groupByDiagnosis("E11.9").code).toBe("E-4-10-I");   // diabetes
    expect(groupByDiagnosis("I21").code).toBe("I-4-15-I");     // ischemic heart
    expect(groupByDiagnosis("J18.9").code).toBe("J-4-10-I");   // pneumonia
    expect(groupByDiagnosis("S72.0").code).toBe("U-3-10-I");   // trauma (S prefix)
    expect(groupByDiagnosis("O80").code).toBe("O-6-10-I");     // delivery
  });

  it("normalises case and punctuation", () => {
    expect(groupByDiagnosis("e11").code).toBe("E-4-10-I");
    expect(groupByDiagnosis("i10.0").code).toBe("I-4-12-I");
  });

  it("falls back to the default group for empty/unknown codes", () => {
    expect(groupByDiagnosis(null).code).toBe("Z-3-00-0");
    expect(groupByDiagnosis("").code).toBe("Z-3-00-0");
    expect(groupByDiagnosis("X99").code).toBe("Z-3-00-0");
  });
});

describe("inacbg: tariff by care class (pure)", () => {
  it("applies the class multiplier and rounds", () => {
    const dm = groupByDiagnosis("E11"); // base 4_200_000
    expect(tariffForClass(dm, "3")).toBe(4_200_000);   // ×1.0
    expect(tariffForClass(dm, "2")).toBe(5_040_000);   // ×1.2
    expect(tariffForClass(dm, "1")).toBe(6_300_000);   // ×1.5
    expect(tariffForClass(dm, "vip")).toBe(7_980_000); // ×1.9
  });

  it("validates care-class codes", () => {
    expect(isCareClass("3")).toBe(true);
    expect(isCareClass("vip")).toBe(true);
    expect(isCareClass("4")).toBe(false);
    expect(isCareClass(2)).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { gcsScore, gcsSeverity, coerceGcsInput, gcsNotation } from "@/lib/gcs";
import { recordGcs, listGcs, gcsSummary } from "@/server/clinical/gcs";

describe("gcs: helpers (pure)", () => {
  it("sums components and bands by threshold", () => {
    expect(gcsScore({ eye: 4, verbal: 5, motor: 6 })).toBe(15);
    expect(gcsScore({ eye: 1, verbal: 1, motor: 1 })).toBe(3);
    expect(gcsSeverity(15)).toBe("mild");
    expect(gcsSeverity(13)).toBe("mild");
    expect(gcsSeverity(12)).toBe("moderate");
    expect(gcsSeverity(9)).toBe("moderate");
    expect(gcsSeverity(8)).toBe("severe");
    expect(gcsSeverity(3)).toBe("severe");
  });
  it("formats notation and coerces untrusted input", () => {
    expect(gcsNotation({ eye: 3, verbal: 4, motor: 5 })).toBe("E3V4M5");
    expect(coerceGcsInput({ eye: 4, verbal: 5, motor: 6 })).toEqual({ eye: 4, verbal: 5, motor: 6 });
    expect(coerceGcsInput({ eye: 5, verbal: 5, motor: 6 })).toBeNull(); // eye max 4
    expect(coerceGcsInput({ eye: 4, verbal: 0, motor: 6 })).toBeNull(); // verbal min 1
    expect(coerceGcsInput({ eye: 4, verbal: 5, motor: 7 })).toBeNull(); // motor max 6
    expect(coerceGcsInput(null)).toBeNull();
  });
});

describe("gcs: server (in-memory)", () => {
  const A = "gcs-test-A";
  const B = "gcs-test-B";

  it("records with server-computed score/severity and rejects bad components", async () => {
    const r = await recordGcs(A, { patientId: "PAT-G1", patientName: "Tn. G", components: { eye: 2, verbal: 2, motor: 4 } });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.assessment.score).toBe(8); expect(r.assessment.severity).toBe("severe"); expect(r.assessment.notation).toBe("E2V2M4"); }
    const bad = await recordGcs(A, { patientId: "PAT-G1", patientName: "Tn. G", components: { eye: 9, verbal: 5, motor: 6 } });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toBe("invalid_components");
  });

  it("summarises severe count, filters by patient, tenant-isolated", async () => {
    await recordGcs(A, { patientId: "PAT-G2", patientName: "Ny. H", components: { eye: 4, verbal: 5, motor: 6 } }); // 15 mild
    const s = await gcsSummary(A);
    expect(s.total).toBe(2);
    expect(s.severe).toBe(1); // only the GCS 8
    expect((await listGcs(A, { patientId: "PAT-G1" })).length).toBe(1);
    expect((await listGcs(B)).length).toBe(0);
    expect((await gcsSummary(B)).total).toBe(0);
  });
});

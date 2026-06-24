import { describe, it, expect } from "vitest";
import { slugifyKey, normalizeFields, validateSubmission, type FormField } from "@/lib/form-builder";

describe("form-builder: slugifyKey (pure)", () => {
  it("slugs a human label into a stable key", () => {
    expect(slugifyKey("Skala Nyeri (0-10)")).toBe("skala-nyeri-0-10");
    expect(slugifyKey("  Tekanan Darah  ")).toBe("tekanan-darah");
  });
  it("falls back to 'field' when nothing slug-able remains", () => {
    expect(slugifyKey("!!!")).toBe("field");
    expect(slugifyKey("")).toBe("field");
  });
});

describe("form-builder: normalizeFields (pure)", () => {
  it("rejects empty / non-array input and bad fields", () => {
    expect(normalizeFields([])).toEqual({ error: "Minimal satu field" });
    expect(normalizeFields("nope")).toEqual({ error: "Minimal satu field" });
    expect("error" in normalizeFields([{ type: "text" }])).toBe(true);            // no label
    expect("error" in normalizeFields([{ label: "X", type: "slider" }])).toBe(true); // bad type
    expect("error" in normalizeFields([{ label: "Pilih", type: "select", options: ["satu"] }])).toBe(true); // <2 options
  });

  it("derives keys, suffixes duplicates, and keeps select options + number unit", () => {
    const r = normalizeFields([
      { label: "Nyeri", type: "text", required: true },
      { label: "Nyeri", type: "text" },                                   // duplicate label → suffixed key
      { label: "Tingkat", type: "select", options: [" Ringan ", "Berat", ""] },
      { label: "Berat Badan", type: "number", unit: "kg" },
    ]);
    expect("fields" in r).toBe(true);
    if (!("fields" in r)) return;
    expect(r.fields[0].key).toBe("nyeri");
    expect(r.fields[0].required).toBe(true);
    expect(r.fields[1].key).toBe("nyeri-2");
    expect(r.fields[2].options).toEqual(["Ringan", "Berat"]); // trimmed, empties dropped
    expect(r.fields[3].unit).toBe("kg");
  });
});

describe("form-builder: validateSubmission (pure)", () => {
  const fields: FormField[] = [
    { key: "nama", label: "Nama", type: "text", required: true },
    { key: "berat", label: "Berat", type: "number" },
    { key: "tgl", label: "Tanggal", type: "date" },
    { key: "tingkat", label: "Tingkat", type: "select", options: ["Ringan", "Berat"] },
    { key: "setuju", label: "Setuju", type: "checkbox" },
  ];

  it("flags a missing required field but ignores empty optional & unchecked checkbox", () => {
    const { ok, errors } = validateSubmission(fields, {});
    expect(ok).toBe(false);
    expect(errors.nama).toBe("Wajib diisi");
    expect(errors.berat).toBeUndefined();  // optional empty
    expect(errors.setuju).toBeUndefined(); // checkbox unchecked is valid
  });

  it("type-checks number, date, and select answers", () => {
    const { ok, errors } = validateSubmission(fields, {
      nama: "Budi", berat: "abc", tgl: "20-06-2026", tingkat: "Sedang",
    });
    expect(ok).toBe(false);
    expect(errors.berat).toBe("Harus berupa angka");
    expect(errors.tgl).toBe("Format tanggal YYYY-MM-DD");
    expect(errors.tingkat).toBe("Pilihan tidak valid");
  });

  it("passes a fully valid submission", () => {
    const { ok, errors } = validateSubmission(fields, {
      nama: "Budi", berat: "72", tgl: "2026-06-20", tingkat: "Berat", setuju: true,
    });
    expect(ok).toBe(true);
    expect(errors).toEqual({});
  });
});

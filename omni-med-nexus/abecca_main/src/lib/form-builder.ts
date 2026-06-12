/**
 * Dynamic clinical forms ("form builder") — a hospital designs its own
 * assessments (pengkajian, skrining, checklist) without code. Client-safe so
 * the designer, the renderer and the server share one field model and ONE
 * validator: what the form shows inline is exactly what the API enforces.
 */
export type FormFieldType = "text" | "textarea" | "number" | "date" | "select" | "checkbox";

export const FORM_FIELD_TYPES: { type: FormFieldType; label: string }[] = [
  { type: "text", label: "Teks singkat" },
  { type: "textarea", label: "Teks panjang" },
  { type: "number", label: "Angka" },
  { type: "date", label: "Tanggal" },
  { type: "select", label: "Pilihan (dropdown)" },
  { type: "checkbox", label: "Centang (ya/tidak)" },
];

export interface FormField {
  /** Stable answer key, unique within the template (slug of the label). */
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  /** Choices — select only. */
  options?: string[];
  /** Unit hint shown next to the input — number only. */
  unit?: string;
}

export type FormAnswers = Record<string, unknown>;

const TYPES: FormFieldType[] = ["text", "textarea", "number", "date", "select", "checkbox"];

/** Answer-key slug from a human label, e.g. "Skala Nyeri (0-10)" → "skala-nyeri-0-10". */
export function slugifyKey(label: string): string {
  return (
    label
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "field"
  );
}

/**
 * Normalise designer output into a valid field list, or return an error string.
 * Guarantees: ≥1 field, valid types, non-empty labels, unique keys (suffixing
 * duplicates), selects carry ≥2 options.
 */
export function normalizeFields(raw: unknown): { fields: FormField[] } | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { error: "Minimal satu field" };
  const seen = new Set<string>();
  const fields: FormField[] = [];
  for (const item of raw) {
    const src = (item ?? {}) as Record<string, unknown>;
    const label = typeof src.label === "string" ? src.label.trim() : "";
    const type = src.type as FormFieldType;
    if (!label) return { error: "Setiap field perlu label" };
    if (!TYPES.includes(type)) return { error: `Tipe field tidak dikenal: ${String(src.type)}` };
    let key = typeof src.key === "string" && src.key.trim() ? src.key.trim() : slugifyKey(label);
    while (seen.has(key)) key = `${key}-2`;
    seen.add(key);
    const field: FormField = { key, label, type };
    if (src.required === true) field.required = true;
    if (type === "select") {
      const options = (Array.isArray(src.options) ? src.options : [])
        .map((o) => String(o).trim())
        .filter(Boolean);
      if (options.length < 2) return { error: `Field "${label}" perlu ≥2 pilihan` };
      field.options = options;
    }
    if (type === "number" && typeof src.unit === "string" && src.unit.trim()) {
      field.unit = src.unit.trim();
    }
    fields.push(field);
  }
  return { fields };
}

/** Validate answers against a field list; errors are keyed by field key. */
export function validateSubmission(
  fields: FormField[],
  answers: FormAnswers,
): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = answers[f.key];
    const empty =
      v === undefined || v === null || (typeof v === "string" && v.trim() === "");
    if (f.type === "checkbox") continue; // unchecked is a valid answer
    if (empty) {
      if (f.required) errors[f.key] = "Wajib diisi";
      continue;
    }
    if (f.type === "number" && !Number.isFinite(Number(v))) {
      errors[f.key] = "Harus berupa angka";
    } else if (f.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) {
      errors[f.key] = "Format tanggal YYYY-MM-DD";
    } else if (f.type === "select" && !(f.options ?? []).includes(String(v))) {
      errors[f.key] = "Pilihan tidak valid";
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
